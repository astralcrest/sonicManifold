/* show your work: the headline's session-block bootstrap, re-run in this tab. classic worker, no imports, no fetch.
   in: { t: [[tap_n, tap_cross, auto_n, auto_cross, mult], ...], seed, B, step }. out: { k, v } every `step`
   resamples, then { done, point, lo, hi, ms, B, S }. mulberry32 (the same generator as bridge-index.html), so a
   seed always gives the same run in every engine. percentiles interpolate like numpy's default (linear). */
'use strict';
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pct(s, p) {
  const h = (s.length - 1) * p, i = Math.floor(h), j = Math.min(s.length - 1, i + 1);
  return s[i] + (h - i) * (s[j] - s[i]);
}
self.onmessage = (e) => {
  const { t, seed, B, step = 100 } = e.data;
  let S = 0;
  for (const r of t) S += r[4];
  /* one row per session block, four counts each */
  const tn = new Int32Array(S), tc = new Int32Array(S), an = new Int32Array(S), ac = new Int32Array(S);
  let k = 0, T0 = 0, T1 = 0, T2 = 0, T3 = 0;
  for (const r of t) for (let m = 0; m < r[4]; m++, k++) {
    tn[k] = r[0]; tc[k] = r[1]; an[k] = r[2]; ac[k] = r[3];
    T0 += r[0]; T1 += r[1]; T2 += r[2]; T3 += r[3];
  }
  const point = (T1 / T0) / (T3 / T2);
  const rand = rng(seed), out = new Float64Array(B), t0 = performance.now();
  let n = 0, from = 0;
  for (let b = 0; b < B; b++) {
    let x0 = 0, x1 = 0, x2 = 0, x3 = 0;
    for (let i = 0; i < S; i++) {
      const j = (rand() * S) | 0;
      x0 += tn[j]; x1 += tc[j]; x2 += an[j]; x3 += ac[j];
    }
    /* numpy's rule: a resample with an empty arm or no autoplay crossing is skipped (never happens at S > 3,000) */
    if (x0 > 0 && x2 > 0 && x3 > 0) out[n++] = (x1 / x0) / (x3 / x2);
    if ((b + 1) % step === 0 || b === B - 1) {
      postMessage({ k: b + 1, v: out.slice(from, n) });
      from = n;
    }
  }
  const ms = performance.now() - t0, s = out.slice(0, n).sort();
  postMessage({ done: true, point, lo: pct(s, 0.025), hi: pct(s, 0.975), ms, B, S, n });
};
