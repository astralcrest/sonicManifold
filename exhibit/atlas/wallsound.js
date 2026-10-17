/* R19 SOUND: the wall's sound policy, exhibit.html?wall=1. wallmode.js calls default(ctx, window.__wall) once.
   sound=touch (the default) makes no AudioContext until the first trusted pointerdown (shell.js takes it), then plays the bed. ?handsoff=
   seconds after the last trusted input the bed dozes: the master fades to a true zero over 3 s and the decks pause; the next trusted
   pointerdown (or key press, or click: what shell.js takes as the first gesture too) brings it back over 1.5 s. sound=on: shell.js tries the unlock at boot and a refusal stays 'locked' until a touch; it never
   dozes. sound=off: shell.js never builds a context. the audio itself (dozeSet, the limiter, vol) is in shell.js; this file decides when to
   doze and says what state the sound is in: ctx.wall.sound = { mode, state(), onState(fn), wake() } */
/* on ctx, not in the module: a second import of this file under another url (a version query) is a second module instance */
const KEY = Symbol.for('r19.wallsound');

export default function wallSound(ctx, wall) {
  if (ctx && ctx[KEY]) return ctx[KEY];
  const A = ctx && ctx.audio; if (!A) return null;
  const O = (wall && wall.opts) || {};
  const mode = O.sound === 'on' || O.sound === 'off' ? O.sound : 'touch';
  const handsoff = Math.min(600, Math.max(5, +O.handsoff || 45)) * 1000;
  const subs = []; let idleSince = performance.now(), last = '';

  /* from the engine's own fields, not A.state(): that one holds its old answer through a press (a tap must not leave the invite up) */
  const derive = () => {
    if (mode === 'off' || A.muted) return 'off';
    if (A.doze) return 'dozed';
    return A.on && A.ac && (A.away || A.ac.state === 'running') ? 'on' : 'locked';
  };
  const publish = () => {
    const s = derive(); if (s === last) return s;
    last = s; subs.slice().forEach((f) => { try { f(s); } catch (e) {} });
    return s;
  };
  const wake = () => {
    idleSince = performance.now();
    if (A.doze && typeof A.dozeSet === 'function') A.dozeSet(false);
    return publish() === 'on';
  };
  /* a post that is armed or hot is someone here: the doze waits for handsoff seconds after it ends */
  const tick = () => {
    const now = performance.now();
    if (A.clipState !== 'off') idleSince = now;
    if (mode === 'touch' && derive() === 'on' && now - idleSince >= handsoff && typeof A.dozeSet === 'function') A.dozeSet(true);
    /* a room that starts a deck on its own while dozed (rooms/bail.js restart() does) must not leave one running: the bed is at zero and nobody is here */
    if (A.doze && A.gain && A.gain.gain.value <= 1e-4) A.els.forEach((e, k) => { if (!e.paused) { A.keep(k); e.pause(); } });
    publish();
  };

  if (mode === 'touch' && typeof A.dozeSet === 'function') {
    const seen = (e) => { if (!e.isTrusted) return; idleSince = performance.now(); if (A.doze && (e.type === 'pointerdown' || e.type === 'keydown' || e.type === 'click')) wake(); };
    ['pointerdown', 'pointerup', 'keydown', 'wheel', 'touchstart', 'touchend', 'click'].forEach((t) => addEventListener(t, seen, { capture: true, passive: true }));
    addEventListener('pointermove', (e) => { if (e.isTrusted && (e.buttons || e.pointerType === 'touch')) idleSince = performance.now(); }, { capture: true, passive: true });
    /* while dozed the rooms keep asking for beds: remember the last ask, start nothing (the wake plays it) */
    const play = A.play, commit = A.commit, rearm = A.rearm;
    A.play = function (track, xf) { if (A.doze) { A.want = track; A.wantXf = xf; return undefined; } return play.call(this, track, xf); };
    A.commit = function (track, xf) { return A.doze ? undefined : commit.call(this, track, xf); };
    A.rearm = function () { return A.doze ? undefined : rearm.call(this); };
  }
  if (mode !== 'off') {
    setInterval(tick, 100);
    if (typeof A.onChange === 'function') A.onChange(publish);
  }

  const api = {
    mode,
    state: derive,
    onState(fn) {
      if (typeof fn !== 'function') return () => {};
      subs.push(fn);
      return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); };
    },
    wake,
  };
  if (!ctx.wall || typeof ctx.wall !== 'object') ctx.wall = {};
  ctx.wall.sound = api; ctx[KEY] = api; publish();
  return api;
}
