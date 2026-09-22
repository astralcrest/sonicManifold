/* room 0 — every play as one dot on a slowly turning sphere, all one colour: nobody has asked yet who pressed play.
   the sphere breathes with the bass. put a hand through it. tilt the phone and the view leans a little with you. */
const SHADES = [0x57507a, 0x7d74a6, 0xa79fd0, 0xd8d2ea];
const TILT0 = 0.3470; /* the fixed axis tilt, radians (cos .94, sin .34) */
const ROT = 0.122;    /* parallax bound: 7 degrees of extra yaw and of extra tilt at full lean */
const SHIFT = 0.025;  /* parallax bound: the centre slides at most 2.5% of the stage's short side, so the core (0.43 * 1.1 bass) stays inside */
const LEAN = 30;      /* degrees of phone tilt that count as a full lean; anything past it is clamped */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const KIOSK = /[?&]kiosk=1\b/.test(location.search); /* a gallery screen is mounted, not held: never raise the os motion sheet there */
export default {
  id: 'threshold', track: 'hitting-the-infinite-derivative',
  rx: 0, ry: 0, px: 0, py: 0, fit: 0.43, live: false, base: null, last: null, granted: false, denied: false, pending: false,
  mount(root, ctx) {
    const n = ctx.particles.n, X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const z = 2 * ctx.hash(i * 3 + 1) - 1, ph = 6.2831853 * ctx.hash(i * 3 + 2), r = Math.sqrt(1 - z * z);
      /* one dot in nine sits in a thin outer shell, so the edge reads as atmosphere */
      const k = ctx.hash(i * 3 + 3) < 0.11 ? 1.07 + ctx.hash(i * 5) * 0.16 : 1;
      X[i] = r * Math.cos(ph) * k; Y[i] = z * k; Z[i] = r * Math.sin(ph) * k;
    }
    this.X = X; this.Y = Y; this.Z = Z;
  },
  place(ctx, t, low) {
    const P = ctx.particles, s = this.s || (this.s = ctx.stage()), n = P.n, X = this.X, Y = this.Y, Z = this.Z; /* stage() reads layout: once per enter, never per frame */
    const m = Math.min(s.w, s.h), px = this.px, py = this.py;
    const R = m * this.fit * (1 + low * 0.1 + Math.sin(t * 0.0009) * 0.018), cx = s.x + s.w / 2 - px * SHIFT * m, cy = s.y + s.h / 2 - py * SHIFT * m;
    const a = t * 0.00011 + px * ROT, ca = Math.cos(a), sa = Math.sin(a), th = TILT0 + py * ROT, ct = Math.cos(th), stl = Math.sin(th); /* tilted axis, leaned by the phone */
    for (let i = 0; i < n; i++) {
      const x = X[i] * ca + Z[i] * sa, z = Z[i] * ca - X[i] * sa;
      P.tx[i] = cx + R * x; P.ty[i] = cy + R * (Y[i] * ct - z * stl);
    }
  },
  /* phone tilt -> two numbers in -1..1. the rest pose is wherever the phone was first held, and drifts slowly toward
     wherever it is held now, so a lean settles back instead of pinning the view. the event handler is the only place
     that touches the sensor; place() just reads two smoothed numbers. */
  onOri(e) {
    const b = e.beta, g = e.gamma; if (b == null || g == null) return;
    /* portrait or landscape from the viewport itself (emulators disagree about the angle of an upright phone); the angle only says which side is up */
    const land = innerWidth > innerHeight, so = screen.orientation, wo = typeof window.orientation === 'number' ? window.orientation : (so && typeof so.angle === 'number' ? so.angle : 0);
    let u, v; /* u: leaning left/right on the screen's own axes, v: leaning forward/back */
    if (land) { if (wo === -90 || wo === 270) { u = -b; v = g; } else { u = b; v = -g; } } else if (wo === 180) { u = -g; v = -b; } else { u = g; v = b; }
    const L = this.last; this.last = [u, v]; this.live = true;
    /* a jump of 40 degrees between two readings is the sensor wrapping past vertical, not a hand: re-centre instead of lurching */
    if (!this.base || (L && (Math.abs(u - L[0]) > 40 || Math.abs(v - L[1]) > 40))) { this.base = [u, v]; this.rx = this.ry = 0; return; }
    const B = this.base; B[0] += (u - B[0]) * 0.004; B[1] += (v - B[1]) * 0.004;
    this.rx = clamp((u - B[0]) / LEAN, -1, 1); this.ry = clamp((v - B[1]) / LEAN, -1, 1);
  },
  /* desktop: the pointer's place on the stage leans the view a little less than a phone would */
  onPtr(e) {
    const s = this.s; if (!s) return; this.live = true;
    this.rx = clamp((e.clientX - s.x - s.w / 2) / (s.w / 2), -1, 1) * 0.4; this.ry = clamp((e.clientY - s.y - s.h / 2) / (s.h / 2), -1, 1) * 0.4;
  },
  listen() { if (this.oriOn) return; this.oriOn = (e) => this.onOri(e); addEventListener('deviceorientation', this.oriOn, { passive: true }); },
  arm(ctx) {
    this.disarm(); this.armed = true;
    if (ctx.reduced) return;
    if (!ctx.coarse) { this.ptrOn = (e) => this.onPtr(e); addEventListener('pointermove', this.ptrOn, { passive: true }); }
    if (typeof DeviceOrientationEvent === 'undefined' || this.denied) return;
    const DOE = DeviceOrientationEvent;
    if (typeof DOE.requestPermission !== 'function' || this.granted) { this.listen(); return; }
    if (KIOSK) return;
    /* ios 13+: the sensor needs asking, and only from inside a real gesture. ask once on the first tap and say nothing either way */
    const ask = (e) => {
      if (!e.isTrusted) { if (this.ask === ask) addEventListener(e.type, ask, { once: true, passive: true }); return; } /* a synthetic event used up the once: put it back */
      /* never on the enter tap or any control: the system sheet only makes sense once someone is touching the sphere itself */
      if (!document.body.classList.contains('entered') || (e.target && e.target.closest && e.target.closest('button,a,input,dialog,#top,#exdock'))) { if (this.ask === ask) addEventListener(e.type, ask, { once: true, passive: true }); return; }
      if (this.pending) return; /* the pointerdown of this same tap already has the system dialog up: touchend must not ask twice */
      let p; try { p = DOE.requestPermission(); } catch (err) { return; }
      if (!p || !p.then) return;
      this.pending = true;
      p.then((st) => {
        if (st === 'granted') { this.granted = true; this.unask(); if (this.armed) this.listen(); } else if (st === 'denied') { this.denied = true; this.unask(); }
      }).catch(() => {}).then(() => { this.pending = false; });
    };
    this.ask = ask;
    addEventListener('pointerdown', ask, { once: true, passive: true });
    addEventListener('touchend', ask, { once: true, passive: true });
  },
  unask() { if (this.ask) { removeEventListener('pointerdown', this.ask); removeEventListener('touchend', this.ask); this.ask = null; } },
  disarm() {
    this.armed = false; this.unask();
    if (this.oriOn) { removeEventListener('deviceorientation', this.oriOn); this.oriOn = null; }
    if (this.ptrOn) { removeEventListener('pointermove', this.ptrOn); this.ptrOn = null; }
    this.rx = this.ry = this.px = this.py = 0; this.base = null; this.last = null; this.live = false;
  },
  enter(ctx) {
    const P = ctx.particles; P.ease = 0.03; P.jitter = 0.5; P.big = false; P.swirl = 0;
    this.s = ctx.stage(); this.t0 = 0;
    /* a phone held upright puts the sphere above the text: its outer shell has to stay clear of the kicker
       under it, so the core is drawn a little smaller there (1.23 shell x 1.02 breath still inside the stage) */
    this.fit = innerWidth > innerHeight * 1.15 ? 0.43 : 0.385;
    if (!this.X) return;
    P.color((i) => SHADES[(ctx.hash(i * 11 + 7) * 4) | 0]);
    this.arm(ctx);
    this.place(ctx, 0, 0);
    if (ctx.reduced) { P.x.set(P.tx); P.y.set(P.ty); }
  },
  frame(g, t, bands, w, h, ctx) {
    if (!this.X || ctx.reduced) return; const P = ctx.particles; const dt = this.t0 ? Math.min(50, t - this.t0) : 16; this.t0 = t;
    if (P.ease < 0.16) P.ease = Math.min(0.16, P.ease + dt * 0.000042); /* gather slowly, then keep up with the turn; by the clock, not by the frame rate */
    /* until a hand or a tilt arrives, the view leans on its own, slowly, so a phone that never grants the
       sensor still sees the sphere as a thing in space and not a still picture. the first real reading ends it. */
    if (!this.live) { this.rx = Math.sin(t * 0.00037) * 0.45; this.ry = Math.sin(t * 0.00023 + 1.1) * 0.35; }
    const k = Math.min(1, dt * 0.005); this.px += (this.rx - this.px) * k; this.py += (this.ry - this.py) * k; /* ~200 ms lag: the view leans, it never snaps */
    this.place(ctx, t, bands.low);
  },
  leave() { this.disarm(); },
};
