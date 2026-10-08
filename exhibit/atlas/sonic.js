/* R10 MUSIC · sonic: the chain walk and the bow (R10/RESEARCH/music.md C3, C2). raw web audio on its own bus, through a
   soft limiter, into A.sfx, so the shell's mute and its listening-post duck cover it too. every pitch is a step on the
   D minor pentatonic ladder (step 0 = D4, five steps an octave, as A.note) moved to the nearest tone of A.pitches(), the
   key of the bed that is playing. silent before sound is armed, while muted, and while a listening post has a clip open
   or playing: never a voice under spotify. at most 8 oscillators sound at once; a ninth takes the oldest one's place.
   kinds: 's' struck (a jump made by hand: a bright pluck), 'q' bowed (the queue: slow swell, filtered), 'b' both. */
const SC = [0, 3, 5, 7, 10], D4 = 293.66, MAXV = 8, AHEAD = 0.15, BOWGAP = 60;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rgba = (h, a) => 'rgba(' + ((h >> 16) & 255) + ',' + ((h >> 8) & 255) + ',' + (h & 255) + ',' + a.toFixed(3) + ')';
const tryf = (f) => { try { return f(); } catch (e) { return undefined; } };

export function install(A, ctx) {
  const live = [], pulses = [], trail = [], sparks = [], html = document.documentElement, PAL = ctx.PAL || {};
  let bus = null, waves = null, walkT = 0, walkQ = null, bowAt = -1e9, bowT = -1e9, bowDeg = null, bowX = 0, bowY = 0;
  const S = { log: [], peak: 0 };

  /* '' = may sound; otherwise why not: off (no gesture yet), muted, clip (a listening post owns the speakers) */
  S.why = () => {
    if (!A.ac || !A.on || A.ac.state !== 'running') return 'off';
    if (A.muted) return 'muted';
    const s = tryf(() => ctx.post.state()) || {};
    if (s.open || s.started || A.ducked || (!('open' in s) && html.classList.contains('exd-open'))) return 'clip';
    return '';
  };
  function graph() {
    if (bus) return bus;
    const ac = A.ac, lim = ac.createDynamicsCompressor();
    lim.threshold.value = -18; lim.knee.value = 6; lim.ratio.value = 4; lim.attack.value = 0.004; lim.release.value = 0.25;
    bus = ac.createGain(); bus.gain.value = 1; bus.connect(lim); lim.connect(A.sfx);
    const wave = (f) => { const n = 16, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = f(k); return ac.createPeriodicWave(re, im); };
    /* a sine with a little triangle on top (the pluck) and a soft saw (the bow, which the filter then darkens) */
    waves = { s: wave((k) => (k === 1 ? 1 : k % 2 ? 0.32 / (k * k) * 3 : 0.04 / k)), q: wave((k) => (k % 2 ? 1 : 0.55) / k) };
    return bus;
  }
  /* semitones above D4 for a ladder step, moved to the nearest tone of the bed's key (a tie goes down, as the shell's snap) */
  S.semi = (deg) => {
    const raw = SC[((deg % 5) + 5) % 5] + 12 * Math.floor(deg / 5), ok = tryf(() => A.pitches()) || [2, 5, 7, 9, 0];
    for (let d = 0; d < 7; d++) { if (ok.includes((((raw - d + 2) % 12) + 12) % 12)) return raw - d; if (ok.includes((((raw + d + 2) % 12) + 12) % 12)) return raw + d; }
    return raw;
  };
  /* a free voice at time t: past the cap, the voice that ends first is faded in 15 ms and the new one starts after it */
  function slot(t) {
    const now = A.ac.currentTime;
    for (let k = live.length - 1; k >= 0; k--) if (live[k].t1 <= now) live.splice(k, 1);
    const at = () => live.filter((v) => v.t0 <= t + 1e-3 && v.t1 > t).length;
    while (at() >= MAXV) {
      let o = null; for (const v of live) if (v.t1 > t && (!o || v.t1 < o.t1)) o = v;
      const s = Math.max(now, o.t0);
      tryf(() => { o.g.gain.cancelScheduledValues(s); o.g.gain.setValueAtTime(o.g.gain.value, s); o.g.gain.linearRampToValueAtTime(0, s + 0.015); o.o.stop(s + 0.02); });
      o.t1 = s + 0.02; t = Math.max(t, s + 0.025);
    }
    return t;
  }
  /* one note. at = seconds from now. o.vol scales the level, o.soft is a repeat (quieter), o.dur overrides the length */
  S.play = (deg, kind, at, o = {}) => {
    if (S.why()) return null;
    graph();
    const ac = A.ac, t = slot(ac.currentTime + Math.max(0, at || 0) + 0.005), semi = S.semi(deg), fr = D4 * Math.pow(2, semi / 12);
    const osc = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(), G = g.gain, F = lp.frequency;
    const k = kind === 'q' || kind === 'b' ? kind : 's', d = o.dur || (k === 's' ? 1.1 : k === 'q' ? 1.5 : 1.4);
    const v = (k === 'q' ? 0.055 : 0.07) * (o.vol || 1) * (o.soft ? 0.55 : 1);
    osc.setPeriodicWave(k === 'q' ? waves.q : waves.s); osc.frequency.value = fr; lp.type = 'lowpass';
    G.setValueAtTime(0, t);
    if (k === 'q') {
      lp.Q.value = 1.1; F.setValueAtTime(fr * 1.2, t); F.linearRampToValueAtTime(fr * 3.2, t + 0.3);
      osc.detune.setValueAtTime(-16, t); osc.detune.linearRampToValueAtTime(0, t + 0.18);
      G.linearRampToValueAtTime(v, t + 0.16); G.linearRampToValueAtTime(v * 0.8, t + Math.max(0.17, d - 0.45));
    } else {
      lp.Q.value = 0.6; F.setValueAtTime(Math.min(14000, fr * (k === 's' ? 9 : 7)), t); F.setTargetAtTime(fr * (k === 's' ? 2.2 : 2.6), t + 0.01, 0.13);
      G.linearRampToValueAtTime(v, t + 0.005);
      if (k === 's') G.exponentialRampToValueAtTime(v * 0.3, t + 0.09);
      else { G.exponentialRampToValueAtTime(v * 0.45, t + 0.12); G.linearRampToValueAtTime(v * 0.4, t + Math.max(0.13, d - 0.45)); }
    }
    G.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(lp); lp.connect(g); g.connect(bus);
    osc.start(t); osc.stop(t + d + 0.03);
    osc.onended = () => tryf(() => { osc.disconnect(); lp.disconnect(); g.disconnect(); });
    const rec = { o: osc, g, t0: t, t1: t + d + 0.03 };
    live.push(rec); S.peak = Math.max(S.peak, live.filter((x) => x.t0 <= t + 1e-3 && x.t1 > t).length);
    const n = { deg, kind: k, semi, f: fr, t, soft: !!o.soft }; S.log.push(n); if (S.log.length > 64) S.log.shift();
    return n;
  };
  /* everything sounding fades in 40 ms, and a walk in progress stops */
  S.stop = () => {
    clearTimeout(walkT); walkT = 0; walkQ = null;
    if (!A.ac) return;
    const now = A.ac.currentTime;
    for (const v of live) if (v.t1 > now) tryf(() => { v.g.gain.cancelScheduledValues(now); v.g.gain.setValueAtTime(v.g.gain.value, now); v.g.gain.linearRampToValueAtTime(0, now + 0.04); v.o.stop(now + 0.05); v.t1 = now + 0.05; });
  };
  /* a melody: [[deg, kind, soft, ms from now], ...]. notes are handed to the clock 150 ms ahead, so a clip that opens
     mid-walk, a mute or a room change silences the rest */
  S.walk = (notes) => {
    S.stop();
    const t0 = performance.now(), q = walkQ = notes.slice();
    const tick = () => {
      if (walkQ !== q) return;
      if (S.why() === 'clip' || S.why() === 'muted') { walkQ = null; return; }
      const el = performance.now() - t0;
      while (q.length && q[0][3] - el < AHEAD * 1000) { const m = q.shift(); S.play(m[0], m[1], Math.max(0, (m[3] - el) / 1000), { soft: m[2] }); }
      if (q.length) walkT = setTimeout(tick, 25); else walkQ = null;
    };
    tick();
  };
  S.walking = () => !!walkQ;
  /* a ring at (x, y) in the room's world, `ms` from now, in the colour of who made the move. reduced motion: none */
  S.pulse = (x, y, ms, col, r) => {
    if (ctx.reduced) return;
    pulses.push({ x, y, t: performance.now() + (ms || 0), c: col == null ? PAL.ice : col, r: r || 1 });
    if (pulses.length > 64) pulses.shift();
  };
  /* the bow (C2): a held finger dragged over the field. the dots under it sound, pitch from the height on the stage
     (top high), timbre from the arm of the nearest dot that has one, at least 60 ms apart. arm(i) is the room's: 0 tapped
     (struck), 1 queued (bowed), -1 a dot that stays silent (haze no star owns) */
  S.bow = (p, arm) => {
    const now = performance.now(), P = ctx.particles;
    trail.push({ x: p.wx, y: p.wy, t: now }); if (trail.length > 72) trail.shift();
    if (now - bowAt < BOWGAP || !P || !P.x) return null;
    const z = (ctx.view && ctx.view.z) || 1, R = 20 / z, R2 = R * R, X = P.x, Y = P.y, N = P.n, wx = p.wx, wy = p.wy;
    let n = 0, best = -1, bd = R2; const lit = [];
    for (let i = 0; i < N; i++) {
      const dx = X[i] - wx; if (dx > R || dx < -R) continue;
      const dy = Y[i] - wy; if (dy > R || dy < -R) continue;
      const d = dx * dx + dy * dy; if (d < R2 && !(arm && arm(i) < 0)) { n++; if (lit.length < 14) lit.push(i); if (d < bd) { bd = d; best = i; } }
    }
    if (best < 0) return null;
    const st = ctx.stage(), deg = Math.round((1 - clamp((p.sy - st.y) / (st.h || 1), 0, 1)) * 9) - 2;
    if (deg === bowDeg && Math.hypot(p.sx - bowX, p.sy - bowY) < 28) return null;
    const a = arm ? arm(best) : 1, kind = a === 0 ? 's' : 'q';
    bowAt = now; bowDeg = deg; bowX = p.sx; bowY = p.sy;
    S.pulse(X[best], Y[best], 0, a === 0 ? PAL.tap : PAL.violet, 0.7);
    if (!ctx.reduced) for (const i of lit) { sparks.push({ x: X[i], y: Y[i], t: now }); if (sparks.length > 96) sparks.shift(); }
    /* the 60 ms hold on the audio clock too: a stolen voice can push a note late, and the next must not crowd it */
    const nt = S.play(deg, kind, Math.max(0, bowT + BOWGAP / 1000 - (A.ac ? A.ac.currentTime : 0) - 0.005), { vol: 0.35 + 0.35 * Math.min(1, n / 30), dur: kind === 's' ? 0.7 : 0.9 });
    if (nt) bowT = nt.t;
    return nt;
  };
  S.bowEnd = () => { bowDeg = null; };
  /* the room's overlay pass (its world transform; lw = one css px): the pulses, then the bow's trail */
  S.draw = (g, now, lw) => {
    const op = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter';
    const arc = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 6.283); };
    for (let k = pulses.length - 1; k >= 0; k--) {
      const p = pulses[k], f = (now - p.t) / 640, e = 1 - (1 - Math.min(1, f)) * (1 - Math.min(1, f)) * (1 - Math.min(1, f));
      if (f >= 1) { pulses.splice(k, 1); continue; }
      if (f < 0) continue;
      g.strokeStyle = rgba(p.c, 0.22 * (1 - f)); g.lineWidth = 9 * (1 - f) * lw; arc(p.x, p.y, (6 + 34 * e) * p.r * lw); g.stroke();
      g.strokeStyle = rgba(p.c, 0.95 * (1 - f)); g.lineWidth = (3 - 2 * f) * lw; arc(p.x, p.y, (6 + 34 * e) * p.r * lw); g.stroke();
      g.strokeStyle = rgba(0xffffff, 0.6 * (1 - f)); g.lineWidth = 1.2 * lw; arc(p.x, p.y, (4 + 16 * e) * p.r * lw); g.stroke();
      if (f < 0.25) { g.fillStyle = rgba(0xffffff, 0.95 * (1 - f / 0.25)); arc(p.x, p.y, 4.5 * p.r * lw); g.fill(); }
    }
    for (let k = sparks.length - 1; k >= 0; k--) {
      const p = sparks[k], f = (now - p.t) / 480;
      if (f >= 1) { sparks.splice(k, 1); continue; }
      g.fillStyle = rgba(0xffffff, 0.9 * (1 - f)); arc(p.x, p.y, (3.4 - 1.6 * f) * lw); g.fill();
    }
    while (trail.length && now - trail[0].t > 1400) trail.shift();
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let s = 0; s < 2; s++) for (let k = 1; k < trail.length; k++) {
      const a = trail[k - 1], b = trail[k], f = 1 - (now - b.t) / 1400;
      g.strokeStyle = s ? rgba(0xffffff, 0.9 * f) : rgba(PAL.ice || 0x86cbfe, 0.4 * f); g.lineWidth = (s ? 1.4 + 2.6 * f : 6 + 14 * f) * lw;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    }
    g.globalCompositeOperation = op;
  };
  S.busy = () => pulses.length > 0 || trail.length > 0 || sparks.length > 0;
  S.alive = () => { if (!A.ac) return 0; const now = A.ac.currentTime; return live.filter((v) => v.t0 <= now && v.t1 > now).length; };
  /* a clip opening (the dock reports its height) or the sound going off ends whatever is sounding */
  const hush = () => { if (S.why()) S.stop(); };
  addEventListener('exhibit:dockh', hush);
  document.addEventListener('atlas:audio', hush);
  return S;
}
