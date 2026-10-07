/* room 0 — every play as one dot on a slowly turning sphere, all one colour: nobody has asked yet who pressed play.
   the sphere breathes with the bass. put a hand through it. tilt the phone and the view leans a little with you.
   atlas mode (BUILD_SPEC_V2 §3 threshold row): the same sphere, now an orbit stop. a drag turns it (the camera's yaw and
   pitch add to the slow turn), the wheel or a pinch scales it, the phone tilt still leans on top, and every dot is a
   glyph. at ?atlas=0 nothing below the `atl` guards runs. */
const SHADES = [0x57507a, 0x7d74a6, 0xa79fd0, 0xd8d2ea];
const TILT0 = 0.3470; /* the fixed axis tilt, radians (cos .94, sin .34) */
const ROT = 0.122;    /* parallax bound: 7 degrees of extra yaw and of extra tilt at full lean */
const SHIFT = 0.025;  /* parallax bound: the centre slides at most 2.5% of the stage's short side, so the core (0.43 * 1.1 bass) stays inside */
const LEAN = 30;      /* degrees of phone tilt that count as a full lean; anything past it is clamped */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const KIOSK = /[?&]kiosk=1\b/.test(location.search); /* a gallery screen is mounted, not held: never raise the os motion sheet there */
/* atlas angles (§3): the whole sphere, close in, and edge on (looking down its axis) */
const POSES = { whole: { yaw: 0, pitch: 0, z: 1 }, close: { pitch: 0.3, z: 1.9 }, edge: { pitch: -1.1, z: 1 } };
const atlasOn = (ctx) => !!(ctx && ctx.atlas && ctx.atlas.on);
/* atlas light (§3 threshold; verify r1 P1-8, r2 P1-4). the renderer sums dot weights per glyph cell, and a sphere of dots
   is uniform by construction, so a cell's dot count says nothing: at 3 to 10 dots a cell it is only grain, and it read as
   a lilac smear of heavy glyphs flipping cell to cell. atlas mode lights the sphere instead, per CELL, the way a glyph renderer
   shades its globe: the room predicts the cell each dot lands in on the next frame (the shell's own ease step, jitter 0),
   shades that cell's centre (lambert under one key light, upper left in front at the home pose, plus a small highlight),
   quantises the shade to one of the 14 ramp levels, and splits the level's cell weight across the cell's dots. so a
   cell's glyph is the light at that point, never its count, and a band of equal light is one run of one glyph.
   the tone curve: the night side a sparse haze of . and ' (the dark side, below), most of the lit side + o *, and only a small highlight
   of & % $ W @. the top level always holds a sliver of the cells, which pins the renderer's exposure (the q-quantile of
   cell weight) to that level's weight; the other levels are placed at the centre of their range through the inverse of
   the renderer's live tone curve. the outer shell is a dithered glow just off the limb. the light is fixed in the
   world, not the camera: a drag or a tour angle moves the terminator, the sphere's own turn does not. every dot keeps a
   weight of at least 1: none is dropped. */
const LV = [-0.46, -0.56, 0.69]; /* the key light at the home pose: x right, y down, depth toward the viewer */
const NIGHT = 1.9, DIFF = 7.2; /* level = 1 + floor(NIGHT + (DIFF - NIGHT) lam + highlight) */
/* the highlight: a gaussian round the half-vector's point, the width of (n.h)^40 on the sphere, but never narrower than
   0.46 x its height in cells, and lower (6.6 levels at 10 rows of cells in radius or fewer, 7 from 20 rows). a highlight
   squeezed into a few rows climbs two levels a row, and the renderer's edge pass then draws its flank as a ring of
   - / \ (seen on the phone); at <= 1.3 levels a cell no flank qualifies as an edge */
const SPEC = 7, SPEC0 = 6.6, SIG = 0.92 / Math.sqrt(40), SIGC = 0.46;
const RH = 1.24, HALO_T = 0.13; /* the glow reaches 1.24 radii and starts just under the renderer's haze line (dithered) */
const TOPQ = 0.007; /* at least this share of the occupied cells sits on the top level: the renderer's exposure anchor */
/* atlas texture (verify r3 P1-7): the sphere is laid out from the log itself. exhibit/data/threshold_grid.json holds the
   public per-day family counts of universe_days.json (one row per logged day, 14 families, nothing else). every play sits
   at its day's longitude (day index / logged days x 2 pi, so the spin is the log turning past) and in its family's band
   (fam_order from the top pole down). a band's height goes with the fourth root of its plays (BANDP): equal bands left
   a phone's 2-row rings of the small families empty, bands sized by plays left no bands at all. a cell's glyph level is
   the light there (TNIGHT, TDIFF: a little brighter than the untextured sphere's, so the mean stays a mid-tone) times
   RK_A + RK_B x the density rank of the plays facing the viewer in it (smoothed over SMOOTH days either side), so a busy
   stretch of a big family reads bright and a quiet one dim. one colour still, and nothing on the sphere is labelled
   (no band, no gap). */
const RK_A = 0.45, RK_B = 0.55, BANDP = 0.25, SMOOTH = 10, TNIGHT = 2.4, TDIFF = 11.5, GRID_WAIT = 600;
/* the limb (round 2, W38; G17): the outermost ring of disc cells on the lit side, where the light reaches lam > RIM_LAM,
   is shaded exactly one level under the darkest disc cell inside it, and so above the glow outside. a rim cell is one whose
   outward left/right or upper/lower neighbour's centre is off the disc (not the diagonal one: that makes the ring two
   cells thick at 45 degrees, where rim meets rim and the edge pass sees no step). every rim cell then has brighter cells
   on one side and darker ones on the other, which is what the renderer's edge pass traces (glyphfield.js: a Sobel step
   with 3 brighter and 3 darker neighbours), so the lit limb reads as one line of edge glyphs: a lit body with an edge, not
   a textured disc. one level, not more: a deeper rim puts the next ring in on a step as well and draws the line twice (a
   phone's coarse cells showed it). where the texture inside is already at the floor there is no line, as on the night
   limb. the sphere's colour is untouched */
const RIM_LAM = 0.12;
/* the dark side (round 3, R2-a; beauty P2-5). with ~16 plays a cell and a smooth light, every dim cell landed on one
   of two glyphs (' or :), row after row: a lattice, not a night. so toward the night each textured disc cell's tone
   (its level bl read as t) is dimmed toward HZ_S of itself, and every one off the limb is then planned by tone, the way
   the glow is, with a grain of +-HZ_A/2 added; dimming and grain are both faded in by a smoothstep of the light alone
   (lambert, no texture: smooth over the disc) from HZ_D1 down to the night's TNIGHT. part of the cells then fall into
   the renderer's haze band, where its own steady dither leaves about a third of the crop blank, and the
   rest mix . ' : ;. the fade follows the light alone, never the texture, so it adds no step of its own for the
   renderer's edge pass (a dimming keyed to the textured level put a / | \ on every band edge of the night), and the
   grain is too fine to read as an edge (+-0.13 of tone: a 3 x 3 Sobel of it stays well under the pass's 0.9). the grain
   is fixed to the sphere, not the screen: the cell's centre is carried back into the body's frame (un-tilt, un-turn)
   and read off a 3d lattice of seeded values GRAIN cell widths apart at the home size, so the night turns with the log
   and never shimmers in place. the limb: rim cells are dimmed with the rest, then set one level under the (dimmed) cells
   inward of them as before, and neither they nor that inward ring take grain, so the lit limb stays one line and fades
   out toward the terminator. the exposure ladder ignores the dark side (its tones are dithered anyway), so the bright
   side keeps its exposure. one hue, no label. (the untextured stand-in keeps its plain night until the grid lands) */
const HZ_D1 = 7.0, HZ_S = 0.2, HZ_A = 0.26, GRAIN = 1.25, HZ_SEED = 0x51ab;
/* the renderer's tone for a continuous level bl (level = 1 + floor(bl) <-> q = bl / 14, t = .03 + .97 q^(1/1.2)), and
   back; tabled (64 steps a level, 2048 of tone) and read with a lerp, since a frame asks a few thousand times */
const TLV = new Float32Array(15 * 64 + 2), LVT = new Float32Array(2050);
for (let i = 0; i < TLV.length; i++) TLV[i] = 0.03 + 0.97 * Math.pow(Math.min(15, i / 64) / 14, 1 / 1.2);
for (let i = 0; i < LVT.length; i++) { const t = Math.min(1, i / 2048); LVT[i] = t > 0.03 ? 14 * Math.pow((t - 0.03) / 0.97, 1.2) : 0; }
const toneOf = (bl) => { const x = (bl < 0 ? 0 : bl > 15 ? 15 : bl) * 64, i = x | 0; return TLV[i] + (TLV[i + 1] - TLV[i]) * (x - i); };
const levelOf = (t) => { const x = (t < 0 ? 0 : t > 1 ? 1 : t) * 2048, i = x | 0; return LVT[i] + (LVT[i + 1] - LVT[i]) * (x - i); };
const grain3 = (x, y, z) => {
  let h = Math.imul(x, 0x8da6b343) ^ Math.imul(y, 0xd8163841) ^ Math.imul(z, 0xcb1ab31f) ^ HZ_SEED;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h ^ (h >>> 13), 0x297a2d39);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const MLAD =[0, 1, 2, 3, 4, 5, 7, 9, 12, 16, 21, 28, 37, 48, 60], LADN = 12; /* the top weights tried: V14 = 256 m + 255 */
/* atlas, who pressed play (R6): IGN_W ms after the stop opens every dot takes its play's arm colour (P.prov once the wall's
   file has dealt it, else the shell's own fallback split of the same hash, 19 / 17 / 64), in IGN_B hashed batches over
   IGN_D ms: never by place, so the sphere's days and bands say nothing about the colour. a three-word key sits on the lower
   disc. hueTrip asks the shell to fade the arm colours into the next stop's over the flight (shell.js MORPH.hk) */
const IGN_W = 900, IGN_D = 2000, IGN_B = 64, KEYW = ['tapped', 'shuffle', 'queue'];
const lit = (v) => { const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255, m = Math.max(r, g, b, 1) / 255; return 'rgb(' + [r, g, b].map((c) => Math.round(c / m)) + ')'; };
export default {
  id: 'threshold', track: 'hitting-the-infinite-derivative',
  /* K2 + W38: the edge pass on (a limb, above), and the renderer's bleach for a sampled room, so the brightest tones (t over
     .8) go toward white the way a lit highlight does; one hue still, the log is not recoloured */
  glyph: { edges: true, bleach: true },
  rx: 0, ry: 0, px: 0, py: 0, fit: 0.43, live: false, base: null, last: null, granted: false, denied: false, pending: false,
  atl: false, vyaw: 0, vpit: 0, vz: 1, vdirty: false, offView: null,
  angles: [{ id: 'whole', name: 'the whole log' }, { id: 'close', name: 'close in' }, { id: 'edge', name: 'edge on' }],
  async mount(root, ctx) {
    const n = ctx.particles.n, X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n);
    if (atlasOn(ctx)) {
      /* the even lattice first (it also sets the world light), then the log's own layout: waited for briefly, so the first
         frame is normally the textured planet; a slow grid lands later and the dots glide to their days */
      this.lattice(ctx, X, Y, Z); this.root = root;
      const got = ctx.data('threshold_grid').then((G) => this.layData(ctx, G)).catch(() => {});
      await Promise.race([got, new Promise((r) => setTimeout(r, GRID_WAIT))]);
      return;
    }
    for (let i = 0; i < n; i++) {
      const z = 2 * ctx.hash(i * 3 + 1) - 1, ph = 6.2831853 * ctx.hash(i * 3 + 2), r = Math.sqrt(1 - z * z);
      /* one dot in nine sits in a thin outer shell, so the edge reads as atmosphere */
      const k = ctx.hash(i * 3 + 3) < 0.11 ? 1.07 + ctx.hash(i * 5) * 0.16 : 1;
      X[i] = r * Math.cos(ph) * k; Y[i] = z * k; Z[i] = r * Math.sin(ph) * k;
    }
    this.X = X; this.Y = Y; this.Z = Z;
  },
  place(ctx, t, low) {
    if (this.atl) { this.placeAtlas(ctx, t, low); return; }
    /* ?atlas=0: today's arithmetic, term for term (the off switch stays bit-identical) */
    const P = ctx.particles, s = this.s || (this.s = ctx.stage()), n = P.n, X = this.X, Y = this.Y, Z = this.Z; /* stage() reads layout: once per enter, never per frame */
    const m = Math.min(s.w, s.h), px = this.px, py = this.py;
    const R = m * this.fit * (1 + low * 0.1 + Math.sin(t * 0.0009) * 0.018), cx = s.x + s.w / 2 - px * SHIFT * m, cy = s.y + s.h / 2 - py * SHIFT * m;
    const a = t * 0.00011 + px * ROT, ca = Math.cos(a), sa = Math.sin(a), th = TILT0 + py * ROT, ct = Math.cos(th), stl = Math.sin(th); /* tilted axis, leaned by the phone */
    for (let i = 0; i < n; i++) {
      const x = X[i] * ca + Z[i] * sa, z = Z[i] * ca - X[i] * sa;
      P.tx[i] = cx + R * x; P.ty[i] = cy + R * (Y[i] * ct - z * stl);
    }
  },
  /* atlas: the camera's pose is read once per frame (three numbers), never inside the per-dot loop. the same projection,
     then the lit cell weights (weigh). the spin (t) turns the sphere under the light; yaw and the lean move the viewer */
  placeAtlas(ctx, t, low) {
    const P = ctx.particles, s = this.s || (this.s = ctx.stage()), n = P.n, X = this.X, Y = this.Y, Z = this.Z, TX = P.tx, TY = P.ty;
    const m = Math.min(s.w, s.h), px = this.px, py = this.py, vz = this.vz;
    const R = m * this.fit * (1 + low * 0.1 + Math.sin(t * 0.0009) * 0.018) * vz, g = this.grow(m, vz), cx = s.x + s.w / 2 - px * SHIFT * m + g[0], cy = s.y + s.h / 2 - py * SHIFT * m + g[1];
    const cyaw = px * ROT + this.vyaw, a = t * 0.00011 + cyaw, ca = Math.cos(a), sa = Math.sin(a), th = TILT0 + py * ROT + this.vpit, ct = Math.cos(th), stl = Math.sin(th);
    const RK = this.RK;
    if (RK) {
      /* textured: also each dot's depth toward the viewer, so a cell's density rank is read from the side facing us only */
      const DZ = this.DZ && this.DZ.length === n ? this.DZ : (this.DZ = new Float32Array(n));
      for (let i = 0; i < n; i++) {
        const Xi = X[i], Yi = Y[i], Zi = Z[i], z = Zi * ca - Xi * sa;
        TX[i] = cx + R * (Xi * ca + Zi * sa); TY[i] = cy + R * (Yi * ct - z * stl); DZ[i] = Yi * stl + z * ct;
      }
    } else {
      for (let i = 0; i < n; i++) {
        const Xi = X[i], Zi = Z[i], z = Zi * ca - Xi * sa;
        TX[i] = cx + R * (Xi * ca + Zi * sa); TY[i] = cy + R * (Y[i] * ct - z * stl);
      }
    }
    /* the turn and the tilt of this frame, so weigh() can carry a cell back onto the body (the dark side's grain) */
    const rot = this.rot || (this.rot = new Float64Array(5)); rot[0] = ca; rot[1] = sa; rot[2] = ct; rot[3] = stl; rot[4] = m * this.fit;
    /* the light in view space: the world light turned by the viewer's yaw only (not the spin), then tilted like the dots */
    const Lw = this.Lw,cy2 = Math.cos(cyaw), sy2 = Math.sin(cyaw), lx0 = Lw[0] * cy2 + Lw[2] * sy2, lz0 = Lw[2] * cy2 - Lw[0] * sy2;
    this.weigh(ctx, cx, cy, R, lx0, Lw[1] * ct - lz0 * stl, Lw[1] * stl + lz0 * ct);
  },
  /* the renderer's tone curve, inverted once per enter from its live TUNE (glyphfield.js: t = (1 - e^(-gain v^gamma)) /
     (1 - e^(-gain)), level = 1 + floor(14 ((t - .03) / .97)^1.2)): lv[L] is the cell weight, as a fraction of the top
     level's, that lands in the middle of level L; vt(t) is the weight for a given t (the glow) */
  toneFor(ctx) {
    const GF = ctx.atlas && ctx.atlas.GF, tu = (GF && GF.info && GF.info().tune) || {}, G = +tu.gain || 2.2, gm = +tu.gamma || 0.7, den = 1 - Math.exp(-G);
    const vt = (tt) => Math.pow(-Math.log(1 - den * Math.min(0.999, tt)) / G, 1 / gm), lv = new Float64Array(15);
    for (let L = 1; L < 14; L++) lv[L] = vt(0.03 + 0.97 * Math.pow((L - 0.5) / 14, 1 / 1.2));
    lv[14] = 1;
    /* vt tabled over t in 0..0.75 (4096 steps, read with a lerp): the glow and the dark side ask it a few thousand times a
       frame, and a log and a pow each cost more than the rest of their plan */
    const VN = 4096, VT = 0.75, vl = new Float32Array(VN + 2); for (let i = 0; i <= VN + 1; i++) vl[i] = vt(Math.min(VT, i * VT / VN));
    const vtf = (t) => { if (!(t > 0)) return 0; if (t >= VT) return vt(t); const x = t * (VN / VT), i = x | 0; return vl[i] + (vl[i + 1] - vl[i]) * (x - i); };
    this.tone = { lv, vt, vtf, q: tu.q > 0 && tu.q < 1 ? +tu.q : 0.995 };
  },
  /* the lit weights for the frame the shell draws next. pass 1 predicts each dot's cell exactly as drawField will bin it
     (x += (tx - x) * ease * (0.5 + seed * .16), swirl and jitter 0 here) and counts the cells; pass 2 shades each occupied
     cell's centre and sets its weight; pass 3 splits that weight across the cell's dots, remainder one unit at a time, so
     the cell sums to it exactly. a dot the pointer parts this frame lands off its predicted cell: the hand leaves a
     disturbance, as it should. cells off the sphere and its glow (a dot still flying in) carry a flat low weight. */
  weigh(ctx, sx, sy, R, lx, ly, ld) {
    const P = ctx.particles, GF = ctx.atlas && ctx.atlas.GF, b = GF && GF.buffers && GF.buffers();
    if (!b || !b.cols || !(R > 0)) return; /* no glyph field (off, stub, not laid out): weights are unused */
    if (!this.tone) this.toneFor(ctx);
    const n = P.n, W = P.w, X = P.x, Y = P.y, TX = P.tx, TY = P.ty, SD = P.seed, e = P.ease, red = !!ctx.reduced, dpr = P.dpr || 1;
    const cols = b.cols, rows = b.rows, NC = cols * rows, gx0 = b.gx0, gy0 = b.gy0, icw = b.invCw, ich = b.invCh, cw = 1 / icw, chh = 1 / ich;
    if (!this.cnt || this.cnt.length < NC) { const c = NC + 1024; this.cnt = new Uint32Array(c); this.cwt = new Int32Array(c); this.crem = new Int32Array(c); this.occ = new Int32Array(c); this.clev = new Float32Array(c); this.crs = new Float32Array(c); this.crn = new Uint32Array(c); }
    if (!this.ci || this.ci.length < n) this.ci = new Int32Array(n);
    const CNT = this.cnt, CWT = this.cwt, REM = this.crem, OCC = this.occ, BL = this.clev, CI = this.ci, RS = this.crs, RN = this.crn;
    const RK = this.RK && this.DZ && this.DZ.length === n ? this.RK : null, DZ = this.DZ;
    let no = 0;
    for (let i = 0; i < n; i++) {
      let x, y;
      if (red) { x = TX[i]; y = TY[i]; } else { const xi = X[i], yi = Y[i], ei = e * (0.5 + SD[i] * 0.16); x = xi + (TX[i] - xi) * ei; y = yi + (TY[i] - yi) * ei; }
      const pxf = x * dpr, pyf = y * dpr; let ci = -1;
      if (pxf >= gx0 && pyf >= gy0) { const cx = ((pxf - gx0) * icw) | 0, cy = ((pyf - gy0) * ich) | 0; if (cx < cols && cy < rows) { ci = cy * cols + cx; if (CNT[ci]++ === 0) OCC[no++] = ci; if (RK && DZ[i] > 0) { RS[ci] += RK[i]; RN[ci]++; } } }
      CI[i] = ci;
    }
    /* shade: BL = the continuous level (1.9..15) of a cell on the disc, minus the target t of a glow cell, 0 off both */
    const T = this.tone, LVv = T.lv, hz0 = ld + 1, hn = Math.hypot(lx, ly, hz0) || 1, hx = lx / hn, hy = ly / hn;
    const DL = RK || (this.dbg && !this.dbg.plan) ? (this.clit && this.clit.length >= CNT.length ? this.clit : (this.clit = new Float32Array(CNT.length))) : null;
    const iR = 1 / R, RH2 = RH * RH, cwC = cw / dpr, chC = chh / dpr, rowsR = R / chC, du1 = cwC * iR, dv1 = chC * iR;
    const S = SPEC0 + (SPEC - SPEC0) * Math.min(1, Math.max(0, (rowsR - 10) / 10)), su = Math.max(SIG, SIGC * S * cwC * iR), sv = Math.max(SIG, SIGC * S * chC * iR), ku = -0.5 / (su * su), kv = -0.5 / (sv * sv);
    if (!this.rimf || this.rimf.length < CNT.length) { this.rimf = new Uint8Array(CNT.length); this.rims = new Int32Array(CNT.length); }
    const RF = this.rimf, RIMS = this.rims; let nr = 0;
    for (let k = 0; k < no; k++) {
      const ci = OCC[k], cy = (ci / cols) | 0, cx = ci - cy * cols;
      const u = ((gx0 + (cx + 0.5) * cw) / dpr - sx) * iR, v = ((gy0 + (cy + 0.5) * chh) / dpr - sy) * iR, rr = u * u + v * v;
      if (rr < 1) {
        const d = Math.sqrt(1 - rr), lam = u * lx + v * ly + d * ld, du = u - hx, dv = v - hy;
        const NI = RK ? TNIGHT : NIGHT, DF = RK ? TDIFF : DIFF;
        let bl = lam > 0 ? NI + (DF - NI) * lam + S * Math.exp(du * du * ku + dv * dv * kv) * (lam < 0.333 ? lam * 3 : 1) : NI;
        if (DL) DL[ci] = bl; /* the light alone: the dark side's fade, and a test hook */
        if (RK) { const rn = RN[ci]; bl *= RK_A + RK_B * (rn ? RS[ci] / rn : 0); } /* no play facing us here: the quietest tone */
        BL[ci] = bl;
        const ua = u < 0 ? -u : u, va = v < 0 ? -v : v, uo = ua + du1, vo = va + dv1;
        if (lam > RIM_LAM && (uo * uo + v * v >= 1 || u * u + vo * vo >= 1)) { RF[ci] = 1; RIMS[nr++] = ci; } /* the lit limb (RIM_LAM above) */
      } else if (rr < RH2) {
        /* the glow: fades out over the shell's depth, brighter where the limb under it is lit */
        const r = Math.sqrt(rr), f = 1 - (r - 1) / (RH - 1), lim = (u * lx + v * ly) / r;
        BL[ci] = -HALO_T * f * f * (0.45 + 0.55 * (lim > 0 ? lim : 0)); /* negative: a target t, not a level */
      } else BL[ci] = 0;
    }
    /* the dark side (HZ_D1 above), first the dimming: toward the night each textured disc cell, the rim too, is taken to
       HZ_S of its tone by the light alone, still as a level, so the limb below steps down from what the inside now shows */
    const HF = RK ? (this.chz && this.chz.length >= CNT.length ? this.chz : (this.chz = new Uint8Array(CNT.length))) : null;
    const HA = RK ? (this.cha && this.cha.length >= CNT.length ? this.cha : (this.cha = new Float32Array(CNT.length))) : null;
    const hz = !!(RK && this.rot);
    if (hz) for (let k = 0; k < no; k++) {
      const ci = OCC[k], bl = BL[ci], lt = DL[ci]; HA[ci] = 0;
      if (!(bl > 0) || !(lt < HZ_D1)) continue;
      let a = (HZ_D1 - lt) / (HZ_D1 - TNIGHT); a = a >= 1 ? 1 : a * a * (3 - 2 * a); a *= 2 - a; /* eased in from HZ_D1, then held toward the night: 1 - (1 - smoothstep)^2 */
      HA[ci] = a; BL[ci] = Math.max(0.01, levelOf(toneOf(bl) * (1 - a * (1 - HZ_S))));
    }
    /* the limb, second pass: each rim cell one level (level = 1 + floor(bl)) under the darkest disc cell inward of it (an
       occupied, non-rim neighbour on the centre's side), never down to the glow's level 1 */
    for (let q = 0; q < nr; q++) {
      const ci = RIMS[q], cy = (ci / cols) | 0, cx = ci - cy * cols;
      const u = (gx0 + (cx + 0.5) * cw) / dpr - sx, v = (gy0 + (cy + 0.5) * chh) / dpr - sy;
      let mn = 1e9;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || dx * u * cwC + dy * v * chC >= 0) continue; /* inward only */
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const nj = ny * cols + nx; if (!CNT[nj] || RF[nj] || !(BL[nj] > 0)) continue;
        if (BL[nj] < mn) mn = BL[nj];
        if (HF) HF[nj] = 2; /* the rim's inward ring takes no grain (below) */
      }
      if (mn < 1e9 && Math.floor(mn) >= 2) BL[ci] = Math.min(BL[ci], Math.floor(mn) - 0.5);
    }
    /* then the grain: a dimmed cell off the rim becomes a target tone (negative BL, as the glow), its grain read at its
       centre's point on the body. the rim cells and the ring just inward of them keep their (dimmed) level: the edge pass
       needs three brighter cells inside a rim cell and three darker outside, and a grain there broke the lit limb's line
       where the dusk reaches it */
    if (hz) {
      const rot = this.rot, ra = rot[0], rs = rot[1], rc = rot[2], rt = rot[3], ig = rot[4] / (GRAIN * cwC);
      for (let k = 0; k < no; k++) {
        const ci = OCC[k], a = HA[ci]; if (!(a > 0) || RF[ci] || HF[ci] === 2) continue;
        const cy = (ci / cols) | 0, cx = ci - cy * cols;
        const u = ((gx0 + (cx + 0.5) * cw) / dpr - sx) * iR, v = ((gy0 + (cy + 0.5) * chh) / dpr - sy) * iR, dd = 1 - u * u - v * v, d = dd > 0 ? Math.sqrt(dd) : 0;
        /* view (u, v, d) -> body: un-tilt, then un-turn (placeAtlas's projection, inverted) */
        const yb = rc * v + rt * d, zp = rc * d - rt * v, xb = u * ra - zp * rs, zb = u * rs + zp * ra;
        const g = grain3(Math.floor(xb * ig), Math.floor(yb * ig), Math.floor(zb * ig));
        BL[ci] = -Math.max(1e-4, toneOf(BL[ci]) + a * HZ_A * (g - 0.5));
        HF[ci] = 1;
      }
    }
    for (let q = 0; q < nr; q++) RF[RIMS[q]] = 0;
    /* the exposure anchor: the renderer maps its q-quantile cell weight to the top of the ramp, so the top level must hold
       more than that share of the occupied cells, or every level would shift; the brightest cells take it (the renderer
       would expose them up anyway). its weight V14 = 256 m + 255 is one short of a multiple of 256, so the renderer's
       quantile bucket rounds up onto it (glyphfield.js ref = min(max, (bucket + 1) * 256)), and m <= 60 keeps the glow
       under 255 a cell, in the haze band. a cell of c dots can show its planned weight V exactly only if c <= V <= 255 c
       (every dot 1..255). the top cells want enough dots to carry V14, and the crowded dim cells (the limb, a busy band
       seen edge on) want a large V14, or their floor of 1 a dot lifts them several levels (seen as # 8 % along the rim
       once the plays were laid out by day, when V14 had followed the sparsest top cell down to 767). so a short ladder of
       m is tried, each with its own top cells (the brightest that can carry it), and the m that leaves the most cells
       exact wins. the current m stays unless another is clearly better: a new m re-seeds the renderer's exposure */
    const need = Math.max(1, Math.ceil(no * Math.max(TOPQ, 1 - T.q + 0.002)));
    const lvl = (bl) => Math.min(13, 1 + Math.floor(bl));
    const H = this.bh || (this.bh = new Uint32Array(512)); H.fill(0);
    for (let k = 0; k < no; k++) { const bl = BL[OCC[k]]; if (bl > 0) H[Math.min(511, (bl * 32) | 0)]++; }
    let acc = 0, j = 511; for (; j > 0; j--) { acc += H[j]; if (acc >= need * 6) break; }
    const CAND = this.cand || (this.cand = []); CAND.length = 0;
    for (let k = 0; k < no; k++) { const ci = OCC[k], bl = BL[ci]; if (bl > 0 && Math.min(511, (bl * 32) | 0) >= j) CAND.push(ci); }
    CAND.sort((p, q) => BL[q] - BL[p]);
    /* can m seat its `need` top cells (the brightest with V/255 <= c <= V dots)? */
    const seats = (m) => { const V = 256 * m + 255, cmin = V / 255; let got = 0; for (let q = 0; q < CAND.length && got < need; q++) { const c = CNT[CAND[q]]; if (c >= cmin && c <= V) got++; } return got >= need; };
    /* the whole ladder is scored only every LADN frames (and whenever the current m can no longer seat its top cells):
       the light and the dots per cell drift slowly, and scoring it every frame cost 0.6 ms */
    this.wn = (this.wn || 0) + 1;
    const curOk = this.m != null && seats(this.m);
    let best = curOk ? this.m : 0, bs = -1, cur = -1;
    if (!curOk || this.wn % LADN === 0) {
      if (!this.cLo || this.cLo.length < CNT.length) { this.cLo = new Float32Array(CNT.length); this.cHi = new Float32Array(CNT.length); }
      const LO = this.cLo, HI = this.cHi;
      for (let k = 0; k < no; k++) {
        /* a dark-side cell (HF) never votes: its tone is dithered anyway, and letting it pull m would re-expose the lit side */
        const ci = OCC[k], bl = BL[ci], c = CNT[ci], f = bl > 0 ? LVv[lvl(bl)] : bl < 0 && !(HF && HF[ci]) ? T.vtf(-bl) : 0;
        if (f > 0) { LO[ci] = c / f; HI[ci] = 255 * c / f; } else { LO[ci] = 0; HI[ci] = 1e9; }
      }
      const score = (m) => {
        const V = 256 * m + 255, cmin = V / 255; let got = 0, lost = 0;
        for (let q = 0; q < CAND.length && got < need; q++) { const ci = CAND[q], c = CNT[ci]; if (c >= cmin && c <= V) { got++; if (LO[ci] <= V && V <= HI[ci]) lost++; } }
        if (got < need) return -1;
        let sc = 0; for (let k = 0; k < no; k++) { const ci = OCC[k]; if (LO[ci] <= V && V <= HI[ci]) sc++; }
        return sc - lost + need;
      };
      if (curOk) bs = cur = score(this.m);
      for (const m of MLAD) { if (m === this.m && curOk) continue; const sc = score(m); if (sc > bs || (sc === bs && m > best)) { bs = sc; best = m; } }
    }
    const mreq = curOk && (cur < 0 || cur >= bs * 0.985) ? this.m : best;
    /* a new top weight re-seeds the renderer's exposure (GF.room via glyphMode resets its EMA), or every level would drift
       for the EMA's ~25 frames while it caught up (seen as a dim, re-banded sphere after a zoom or a resize) */
    if (this.m !== mreq) { P.glyphMode('cont', this.glyph); this.m = mreq; }
    const V14 = 256 * this.m + 255, cmin = V14 / 255, wFree = Math.max(1, Math.min(255, Math.round(LVv[3] * V14))), vFree = LVv[6] * V14;
    const TOPF = this.ctop && this.ctop.length >= CNT.length ? this.ctop : (this.ctop = new Uint8Array(CNT.length));
    let got = 0; for (let q = 0; q < CAND.length && got < need; q++) { const ci = CAND[q], c = CNT[ci]; if (c >= cmin && c <= V14) { TOPF[ci] = 1; got++; } }
    if (got < need) for (let q = 0; q < CAND.length && got < need; q++) { const ci = CAND[q]; if (!TOPF[ci]) { TOPF[ci] = 1; got++; } } /* nothing can carry it: the brightest, as before */
    /* a disc cell whose level its dots cannot carry (a few plays asked to be bright, or a crowd asked to be faint) is
       planned at the nearest level they can: the renderer sums the weights, so that is the level it would draw anyway,
       and the plan (and the test hook) says so. a sparse patch is dimmer: that is the texture, not an error */
    const LEV = this.clevl && this.clevl.length >= CNT.length ? this.clevl : (this.clevl = new Uint8Array(CNT.length));
    for (let k = 0; k < no; k++) {
      const ci = OCC[k], bl = BL[ci], c = CNT[ci];
      let V;
      if (bl > 0) {
        let L = TOPF[ci] ? 14 : lvl(bl);
        if (L < 14) { if (LVv[L] * V14 > 255 * c) { while (L > 1 && LVv[L] * V14 > 255 * c) L--; } else if (LVv[L] * V14 < c) { while (L < 13 && LVv[L] * V14 < c) L++; } }
        V = L >= 14 ? V14 : Math.round(LVv[L] * V14); LEV[ci] = L;
      } else if (bl < 0) V = Math.round(T.vtf(-bl) * V14);
      else V = Math.round(Math.min(c * wFree, vFree));
      const base = Math.floor(V / c); CWT[ci] = base; REM[ci] = V - base * c;
    }
    for (let i = 0; i < n; i++) {
      const ci = CI[i]; if (ci < 0) { W[i] = wFree; continue; }
      let w = CWT[ci]; if (REM[ci] > 0) { REM[ci]--; w++; }
      W[i] = w < 1 ? 1 : w > 255 ? 255 : w;
    }
    this.lk = [cols, rows, gx0, gy0, icw, ich, dpr]; /* the lattice these weights are for (reduced motion re-weighs when it changes) */
    /* test hook: the first plan after mod.dbg = {} is kept, with the render count it was made after */
    if (this.dbg && !this.dbg.plan) { const D = this.dbg; D.r = GF.info().renders; D.m = this.m; D.no = no; D.V14 = V14; D.tex = !!RK; D.plan = new Map(); for (let k = 0; k < no; k++) { const ci = OCC[k], bl = BL[ci]; const hz = HF && HF[ci]; D.plan.set(ci, [bl > 0 ? LEV[ci] : hz ? -2 : bl < 0 ? -1 : 0, CNT[ci], CWT[ci], RN[ci] ? RS[ci] / RN[ci] : -1, (bl > 0 || hz) && DL ? DL[ci] : 0, hz ? -bl : 0]); } }
    for (let k = 0; k < no; k++) { const ci = OCC[k]; CNT[ci] = 0; RS[ci] = 0; RN[ci] = 0; TOPF[ci] = 0; }
    if (HF) for (let k = 0; k < no; k++) HF[OCC[k]] = 0;
  },
  /* atlas positions: the same sphere and outer shell, laid on a jittered spherical fibonacci lattice instead of uniform
     random points, so each glyph cell holds about the same number of dots: few cells on the disc are empty, and a
     cell's lit weight (weigh) splits into near-equal shares that stay inside 1..255. one dot in nine is still in the shell (the same hash picks which), and the jitter (a quarter of the spacing)
     breaks the lattice so it never moires against the cell grid while the sphere turns. dots take lattice slots in a
     scrambled order (a stride coprime to the count), so a dot's index says nothing about where it sits on the sphere and
     a flight to the next stop leaves from everywhere at once, as it does from the random sphere */
  lattice(ctx, X, Y, Z) {
    const n = X.length, h = ctx.hash, shell = new Uint8Array(n);
    let nb = 0; for (let i = 0; i < n; i++) { shell[i] = h(i * 3 + 3) < 0.11 ? 1 : 0; if (!shell[i]) nb++; }
    const ns = n - nb, GA = Math.PI * (3 - Math.sqrt(5));
    const gcd = (a, b) => (b ? gcd(b, a % b) : a), stride = (N) => { let q = Math.max(1, Math.round(N * 0.6180339887)); while (N > 1 && gcd(q, N) !== 1) q++; return q; };
    const qb = stride(nb), qs = stride(ns);
    let jb = 0, js = 0;
    for (let i = 0; i < n; i++) {
      const sh = shell[i], N = sh ? ns : nb, j = sh ? (js++ * qs) % Math.max(1, ns) : (jb++ * qb) % Math.max(1, nb), sp = Math.sqrt(4 * Math.PI / Math.max(1, N)) * 0.26;
      const zz = 1 - (2 * j + 1) / N, r = Math.sqrt(Math.max(0, 1 - zz * zz)), ph = j * GA;
      let x = r * Math.cos(ph) + (h(i * 7 + 1) - 0.5) * 2 * sp, y = zz + (h(i * 7 + 2) - 0.5) * 2 * sp, z = r * Math.sin(ph) + (h(i * 7 + 4) - 0.5) * 2 * sp;
      const k = sh ? 1.07 + h(i * 5) * 0.16 : 1, L = k / (Math.hypot(x, y, z) || 1);
      X[i] = x * L; Y[i] = y * L; Z[i] = z * L;
    }
    /* the world light: the home-pose view light un-tilted (yaw 0, lean 0) */
    const ln = Math.hypot(LV[0], LV[1], LV[2]), vx = LV[0] / ln, vy = LV[1] / ln, vd = LV[2] / ln, c = Math.cos(TILT0), sn = Math.sin(TILT0);
    this.Lw = [vx, vy * c + vd * sn, vd * c - vy * sn];
    this.X = X; this.Y = Y; this.Z = Z;
  },
  /* the log's own layout (see RK_A above). plays are taken in (day, family) order and dealt to the dots through a stride
     coprime to the dot count, so a dot's index still says nothing about where it sits and a flight out leaves from
     everywhere at once. with fewer dots than plays (a small screen) dot p stands for play (p + .5) x plays / dots. inside
     its day and band a play sits at a hashed spot, uniform in area. the density rank of a (day, family) slot is its plays
     per unit of band area, smoothed over five days (1 2 3 2 1), as a share of all plays below it (half its own counted).
     the outer shell keeps its one dot in nine (the same hash), lifted off the same spot. new arrays, swapped in at once. */
  layData(ctx, G) {
    const g = G && G.g, nD = G && G.days | 0, F = 14;
    if (!g || !nD || g.length !== nD * F) return false;
    const n = ctx.particles.n, h = ctx.hash, X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n), RK = new Float32Array(n);
    const K = nD * F, cum = new Float64Array(K + 1);
    for (let k = 0; k < K; k++) cum[k + 1] = cum[k] + (g[k] > 0 ? g[k] : 0);
    const tot = cum[K]; if (!(tot > 0)) return false;
    const ft = new Float64Array(F); for (let k = 0; k < K; k++) ft[k % F] += g[k];
    let hs = 0; const hg = new Float64Array(F); for (let f = 0; f < F; f++) { hg[f] = Math.pow(ft[f], BANDP); hs += hg[f]; }
    const y0 = new Float64Array(F + 1); y0[0] = -1; for (let f = 0; f < F; f++) y0[f + 1] = y0[f] + 2 * hg[f] / hs;
    /* density per slot, then its rank among plays */
    const den = new Float64Array(K), SM = SMOOTH;
    for (let d = 0; d < nD; d++) for (let f = 0; f < F; f++) {
      if (!(g[d * F + f] > 0)) continue;
      let s = 0, w = 0; for (let j = -SM; j <= SM; j++) { const dd = d + j; if (dd < 0 || dd >= nD) continue; const wj = SM + 1 - Math.abs(j); s += wj * g[dd * F + f]; w += wj; }
      den[d * F + f] = s / w / (hg[f] || 1);
    }
    const idx = []; for (let k = 0; k < K; k++) if (g[k] > 0) idx.push(k);
    idx.sort((a, b) => den[a] - den[b]);
    const rank = new Float32Array(K); let below = 0;
    for (let q = 0; q < idx.length;) { /* ties share one rank */
      let e = q, c = 0; while (e < idx.length && den[idx[e]] === den[idx[q]]) { c += g[idx[e]]; e++; }
      const r = (below + c * 0.5) / tot; for (let z = q; z < e; z++) rank[idx[z]] = r;
      below += c; q = e;
    }
    const gcd = (a, b) => (b ? gcd(b, a % b) : a); let qs = Math.max(1, Math.round(n * 0.6180339887)); while (n > 1 && gcd(qs, n) !== 1) qs++;
    const ord = new Int32Array(n); for (let i = 0; i < n; i++) ord[(i * qs) % n] = i;
    const TAU = 2 * Math.PI; let k = 0;
    for (let p = 0; p < n; p++) {
      const i = ord[p], j = Math.min(tot - 1, Math.floor((p + 0.5) * tot / n));
      while (k < K - 1 && cum[k + 1] <= j) k++;
      const d = (k / F) | 0, f = k - d * F;
      const lon = TAU * (d + h(i * 7 + 1)) / nD, yy = y0[f] + (y0[f + 1] - y0[f]) * h(i * 7 + 2), r = Math.sqrt(Math.max(0, 1 - yy * yy));
      const sc = h(i * 3 + 3) < 0.11 ? 1.07 + h(i * 5) * 0.16 : 1;
      X[i] = r * Math.cos(lon) * sc; Y[i] = yy * sc; Z[i] = r * Math.sin(lon) * sc; RK[i] = rank[k];
    }
    this.X = X; this.Y = Y; this.Z = Z; this.RK = RK; this.DZ = null; this.gridDays = nD; this.bandY = y0;
    this.vdirty = true; this.m = null; /* reduced motion re-places at once; the exposure re-seeds on the new texture */
    return true;
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
  listen() { if (this.oriOn || !('DeviceOrientationEvent' in window) || !matchMedia('(pointer: coarse)').matches) return; this.oriOn = (e) => this.onOri(e); addEventListener('deviceorientation', this.oriOn, { passive: true }); },
  arm(ctx) {
    this.disarm(); this.armed = true;
    if (ctx.reduced) return;
    /* atlas: a drag turns the sphere, so the hover lean would fight the hand. the phone tilt below still leans on top */
    if (!ctx.coarse && !this.atl) { this.ptrOn = (e) => this.onPtr(e); addEventListener('pointermove', this.ptrOn, { passive: true }); }
    if (typeof DeviceOrientationEvent === 'undefined' || this.denied) return;
    const DOE = DeviceOrientationEvent;
    if (typeof DOE.requestPermission !== 'function' || this.granted) { this.listen(); return; }
    if (KIOSK) return;
    /* the atlas chrome (info panel, dock, ladder, labels) is interface, not the sphere: a tap there never raises the sheet */
    const NOT = this.atl ? 'button,a,input,dialog,#top,#exdock,#atlas-info,#atlas-dock,#atlas-labels,.atlas-ladder,[role=dialog]' : 'button,a,input,dialog,#top,#exdock';
    /* ios 13+: the sensor needs asking, and only from inside a real gesture. ask once on the first tap and say nothing either way */
    const ask = (e) => {
      if (!e.isTrusted) { if (this.ask === ask) addEventListener(e.type, ask, { once: true, passive: true }); return; } /* a synthetic event used up the once: put it back */
      /* never on the enter tap or any control: the system sheet only makes sense once someone is touching the sphere itself */
      if (!document.body.classList.contains('entered') || (e.target && e.target.closest && e.target.closest(NOT))) { if (this.ask === ask) addEventListener(e.type, ask, { once: true, passive: true }); return; }
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
    this.atl = atlasOn(ctx);
    /* atlas: the shell re-runs enter() when the stage merely changes size (a phone's caption gaining a line moves it 2 px):
       that keeps the tilt, the lean and the exposure the sphere already has (round 2b: each re-arm dropped a phone's tilt,
       so the light swung back to the idle lean, and each re-seed re-exposed the whole body) */
    const re = this.atl && !!(ctx.atlas && ctx.atlas.reenter) && this.armed;
    /* a phone held upright puts the sphere above the text: its outer shell has to stay clear of the kicker
       under it, so the core is drawn a little smaller there (1.23 shell x 1.02 breath still inside the stage) */
    this.fit = innerWidth > innerHeight * 1.15 ? 0.43 : 0.385;
    if (this.atl) this.enterAtlas(ctx, re);
    if (!this.X) return;
    if (this.atl && this.ig) { this.arms(ctx); this.paintArm(ctx, 0, IGN_B); this.ig = 2; if (ctx.reduced) P.c.set(P.tc); }
    else P.color((i) => SHADES[(ctx.hash(i * 11 + 7) * 4) | 0]);
    if (!re) this.arm(ctx);
    this.place(ctx, 0, 0);
    if (ctx.reduced) { P.x.set(P.tx); P.y.set(P.ty); }
    if (this.atl) { this.keyOn(ctx); if (!this.ig && !this.igTo) this.igTo = setTimeout(() => this.ignite(ctx), IGN_W); }
  },
  /* ---------------------------------------------------------------- atlas: who pressed play */
  arms(ctx) {
    const P = ctx.particles, n = P.n, pv = P.prov, ok = pv.indexOf(2) >= 0, ga = this.ga = new Uint8Array(n), hb = this.hb = new Uint8Array(n);
    for (let i = 0; i < n; i++) { const u = ctx.hash(i); ga[i] = ok ? pv[i] : u < 0.19 ? 0 : u < 0.36 ? 1 : 2; hb[i] = (ctx.hash(i * 13 + 5) * IGN_B) | 0; }
    this.pk = ctx.PROV.map((v) => 0xff000000 | ((v & 0xff) << 16) | (v & 0xff00) | ((v >> 16) & 0xff)); /* P.color's packing */
  },
  paintArm(ctx, b0, b1) { const TC = ctx.particles.tc, ga = this.ga, hb = this.hb, pk = this.pk; for (let i = 0; i < TC.length; i++) { const b = hb[i]; if (b >= b0 && b < b1) TC[i] = pk[ga[i]]; } },
  ignite(ctx) {
    this.igTo = 0; if (!this.atl || this.ig) return;
    this.arms(ctx); this.ig = 1; this.ib = 0; this.igT = performance.now(); this.hueTrip = true;
    this.glyph = { edges: true, bleach: false }; this.m = null; /* a hue now says who pressed play: the highlight no longer goes white */
    if (ctx.reduced) { this.paintArm(ctx, 0, IGN_B); ctx.particles.c.set(ctx.particles.tc); this.ig = 2; }
    this.keyOn(ctx);
  },
  dissolve() {
    const b = Math.min(IGN_B, Math.floor((performance.now() - this.igT) / IGN_D * IGN_B) + 1);
    if (b > this.ib) { this.paintArm(this.ctx0, this.ib, b); this.ib = b; if (b >= IGN_B) this.ig = 2; }
  },
  /* the key: three words in the three colours as the glyph pass draws them (a cell's hue at full tone), on the lower disc */
  keyOn(ctx) {
    this.ctx0 = ctx;
    let k = this.key;
    if (!k && this.root) {
      k = this.key = document.createElement('p'); k.className = 'thr-key'; k.setAttribute('aria-hidden', 'true');
      k.style.cssText = 'position:fixed;left:0;top:0;margin:0;z-index:3;pointer-events:none;white-space:nowrap;font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:rgba(216,210,234,.55);padding:7px 11px;border-radius:999px;background:rgba(10,1,24,.66);opacity:0;transition:opacity .9s ease';
      KEYW.forEach((w, j) => { if (j) k.append(' · '); const s = document.createElement('b'); s.textContent = w; s.style.cssText = 'font-weight:600;color:' + lit(ctx.PROV[j]); k.appendChild(s); });
      this.root.appendChild(k);
    }
    if (!k) return;
    if (ctx.reduced) k.style.transition = 'none';
    k.style.opacity = this.ig ? '1' : '0'; this.moveKey();
  },
  moveKey() {
    const k = this.key, s = this.s; if (!k || !s) return;
    const m = Math.min(s.w, s.h), R = m * this.fit * this.vz, g = this.grow(m, this.vz);
    const x = s.x + s.w / 2 + g[0], y = Math.min(s.y + s.h / 2 + g[1] + R * 0.74, s.y + s.h - 16);
    k.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px) translate(-50%,-50%)';
  },
  /* ---------------------------------------------------------------- atlas */
  enterAtlas(ctx, re) {
    const v = ctx.view, P = ctx.particles;
    /* orbit (§1.5): the room keeps its own projection and reads yaw, pitch and z from the camera. z scales the radius */
    v.configure({ mode: 'orbit', zMin: 0.6, zMax: 2.2, drift: true, home: POSES.whole });
    this.readView(ctx);
    if (this.offView) this.offView();
    this.offView = v.onChange(() => { this.readView(ctx); this.vdirty = true; this.moveLabel(ctx); });
    P.glyphAll(true); P.glyphMode('cont', this.glyph); /* every dot a glyph; one hue, so the sampled colour is the sphere's own violet grey */
    /* no shimmer: a glyph cell is the unit here, and the lit weights need each dot's next cell exactly (weigh) */
    P.jitter = 0; if (!re) { this.tone = null; this.m = null; }
    this.setLabels(ctx);
  },
  /* closer than home, the sphere grows away from the wall text: rightward in landscape (its left limb stays where it
     was, so the words never sit under the field), upward in portrait (its lower limb stays above the info card) */
  grow(m, vz) {
    if (!this.atl || vz <= 1) return [0, 0];
    const d = m * this.fit * (vz - 1);
    return innerWidth > innerHeight * 1.15 ? [d, 0] : [0, -d];
  },
  readView(ctx) { const v = ctx.view; this.vyaw = +v.yaw || 0; this.vpit = +v.pitch || 0; this.vz = +v.z || 1; },
  /* the one region label: the count of plays, over the sphere's upper left limb, riding the zoom */
  labelAt() {
    const s = this.s, m = Math.min(s.w, s.h), R = m * this.fit * this.vz, g = this.grow(m, this.vz), cx = s.x + s.w / 2 + g[0], cy = s.y + s.h / 2 + g[1];
    return [cx - R * 0.95, cy - R * 1.0];
  },
  setLabels(ctx) {
    const [x, y] = this.labelAt(), plays = (ctx.stats && ctx.stats.plays) || 97427;
    ctx.labels.set('threshold', [{ id: 'plays', text: plays.toLocaleString('en-US') + ' plays', x, y, space: 'world', kind: 'region', pri: 6, r: 4,
      go: (c) => { c.view.flyTo(POSES.close, { speed: 'slow', lock: plays.toLocaleString('en-US') + ' plays' }); } }]);
  },
  moveLabel(ctx) { if (!this.s) return; const [x, y] = this.labelAt(); ctx.labels.update('threshold', 'plays', { x, y }); this.moveKey(); },
  setAngle(k, ctx, o = {}) {
    const a = this.angles[k]; if (!a || !atlasOn(ctx)) return 0;
    const pose = POSES[a.id], v = ctx.view;
    if (o.instant || ctx.reduced) { v.set(pose, { instant: true }); return 0; }
    v.flyTo(pose, { speed: 'slow' });
    /* the tour holds from here: roughly the camera's own orbit-flight length for this swing (camera.js, slow) */
    const dy = Math.abs(Math.atan2(Math.sin((pose.yaw == null ? v.yaw : pose.yaw) - v.yaw), Math.cos((pose.yaw == null ? v.yaw : pose.yaw) - v.yaw))), dp = Math.abs(pose.pitch - v.pitch), lz = Math.abs(Math.log(pose.z / (v.z || 1)));
    return Math.round(clamp((0.9 + 0.55 * Math.hypot(dy, dp) + 0.8 * lz) * 1.5, 1.2, 3.4) * 1000);
  },
  /* reduced motion places only on a view change, so a new glyph lattice (the governor's cell tier, a resize) must also
     re-place, or the lit weights would stay split for cells that no longer exist */
  relaid(ctx) {
    const GF = ctx.atlas && ctx.atlas.GF, b = GF && GF.buffers && GF.buffers(), k = this.lk;
    if (!b || !b.cols) return false;
    return !k || k[0] !== b.cols || k[1] !== b.rows || k[2] !== b.gx0 || k[3] !== b.gy0 || k[4] !== b.invCw || k[5] !== b.invCh || k[6] !== ctx.particles.dpr;
  },
  focus() { return false; }, /* the threshold holds no searchable object: stop names route here through ctx.go alone */
  pick() { return null; },
  precision() { return []; },
  frame(g, t, bands, w, h, ctx) {
    if (!this.X) return;
    if (this.ig === 1) this.dissolve();
    if (ctx.reduced) {
      /* reduced motion: no auto-turn, but direct manipulation still answers (the view re-places the sphere at once) */
      if (this.atl && (this.vdirty || this.relaid(ctx))) { this.vdirty = false; const P = ctx.particles; this.place(ctx, 0, 0); P.x.set(P.tx); P.y.set(P.ty); }
      return;
    }
    const P = ctx.particles; const dt = this.t0 ? Math.min(50, t - this.t0) : 16; this.t0 = t;
    if (P.ease < 0.16) P.ease = Math.min(0.16, P.ease + dt * 0.000042); /* gather slowly, then keep up with the turn; by the clock, not by the frame rate */
    /* a hand on the sphere: the dots follow the drag at once instead of easing after it */
    if (this.atl && ctx.gesture && ctx.gesture.dragging && P.ease < 0.3) P.ease = 0.3;
    else if (this.atl && P.ease > 0.16 && !(ctx.gesture && ctx.gesture.dragging)) P.ease = Math.max(0.16, P.ease - dt * 0.0004);
    /* until a hand or a tilt arrives, the view leans on its own, slowly, so a phone that never grants the
       sensor still sees the sphere as a thing in space and not a still picture. the first real reading ends it. */
    if (!this.live) { this.rx = Math.sin(t * 0.00037) * 0.45; this.ry = Math.sin(t * 0.00023 + 1.1) * 0.35; }
    const k = Math.min(1, dt * 0.005); this.px += (this.rx - this.px) * k; this.py += (this.ry - this.py) * k; /* ~200 ms lag: the view leans, it never snaps */
    this.place(ctx, t, bands.low);
  },
  leave() { this.disarm(); if (this.offView) { this.offView(); this.offView = null; } if (this.igTo) { clearTimeout(this.igTo); this.igTo = 0; } if (this.key) this.key.style.opacity = '0'; },
};
