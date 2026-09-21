/* room 0: the dots drift, unsorted. nothing to do but enter. */
export default {
  id: 'threshold', track: 'hitting-the-infinite-derivative',
  mount() {},
  enter(ctx) { const P = ctx.particles; P.ease = 0.02; P.jitter = 1.6; P.big = false; P.scatter(); P.color(() => ctx.PAL.fog); },
  leave() {},
};
