/* room 0 — every play as one dot on a slowly turning sphere, all one colour: nobody has asked yet who pressed play.
   the sphere breathes with the bass. put a hand through it. */
const SHADES = [0x57507a, 0x7d74a6, 0xa79fd0, 0xd8d2ea];
export default {
  id: 'threshold', track: 'hitting-the-infinite-derivative',
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
    const P = ctx.particles, s = ctx.stage(), n = P.n, X = this.X, Y = this.Y, Z = this.Z;
    const R = Math.min(s.w, s.h) * 0.43 * (1 + low * 0.1), cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    const a = t * 0.00011, ca = Math.cos(a), sa = Math.sin(a), ct = 0.94, stl = 0.34; /* tilted axis */
    for (let i = 0; i < n; i++) {
      const x = X[i] * ca + Z[i] * sa, z = Z[i] * ca - X[i] * sa;
      P.tx[i] = cx + R * x; P.ty[i] = cy + R * (Y[i] * ct - z * stl);
    }
  },
  enter(ctx) {
    const P = ctx.particles; P.ease = 0.03; P.jitter = 0.5; P.big = false; P.swirl = 0;
    if (!this.X) return;
    P.color((i) => SHADES[(ctx.hash(i * 11 + 7) * 4) | 0]);
    this.place(ctx, 0, 0);
    if (ctx.reduced) { P.x.set(P.tx); P.y.set(P.ty); }
  },
  frame(g, t, bands, w, h, ctx) { if (!this.X || ctx.reduced) return; const P = ctx.particles; if (P.ease < 0.16) P.ease += 0.0007; /* gather slowly, then keep up with the turn */ this.place(ctx, t, bands.low); },
  leave() {},
};
