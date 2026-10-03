/* room 6 — make your own. the finale: the wall from room 01 re-forms, everything the queue chose
   falls out of the picture, and what is left (the plays i tapped) rises into a camelot wheel: two
   rings, inner is the minor keys, outer is the major ones, and the twenty-two tracks i made from
   this log sit at their real key. tap one to hear it; its harmonic neighbours glow.
   data: exhibit/data/tracks.json, and dot provenance from exhibit/data/wall.json via ctx.identity().
   atlas mode (BUILD_SPEC_V2 §3 make row): beats one and two are the wall again in categorical glyphs (the shape says
   who pressed play: o a tap, x a shuffle, = the queue) on a grid cut to the wall's own dot pitch, with the camera held
   at identity; beat three is the wheel in one mint ramp (mean colour) under a pan camera (zoom 1-2.2). the wheel's dom
   (circles, key text, deck badges, the tap layer) rides the camera in one css layer, in its existing tab order. every
   key that holds a track is named as a [ label ]; a tap on one prints the camelot mixing rule for it (music theory,
   not a finding) and lights the tracks in keys that mix cleanly with it. */
const RIM = 0.36, TAU = 6.2831853;
const B1 = 1400, B2 = 2600, SETTLE = 1400; /* beat boundaries in ms, read off the frame clock */
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two'];
function ang(n) { return (n - 1) * 30 - 90; }
function rad(d) { return d * Math.PI / 180; }
/* k of the way from one 0xRRGGBB to another */
function mix(a, b, k) { const r = (a >> 16 & 255) + ((b >> 16 & 255) - (a >> 16 & 255)) * k, g = (a >> 8 & 255) + ((b >> 8 & 255) - (a >> 8 & 255)) * k, c = (a & 255) + ((b & 255) - (a & 255)) * k; return (r << 16 | g << 8 | c) & 0xffffff; }
function parseKey(k) { return { num: parseInt(k, 10), letter: k.slice(-1) }; }
function sameKey(a, b) { return a.num === b.num && a.letter === b.letter; }
function adjKey(a, b) { if (a.num === b.num && a.letter !== b.letter) return true; if (a.letter === b.letter) { const d = Math.abs(a.num - b.num); return d === 1 || d === 11; } return false; }
const atlasOn = (ctx) => !!(ctx && ctx.atlas && ctx.atlas.on);
/* the camelot mixing rule for one key: the same number in the other letter, then one step either way in the same letter */
function mixKeys(num, letter) { const o = letter === 'A' ? 'B' : 'A', dn = ((num + 10) % 12) + 1, up = (num % 12) + 1; return [num + o, dn + letter, up + letter]; }

export default {
  id: 'make', track: 'reach-back', ready: false, tracks: [], playing: -1, neighborSet: null,
  beat: 0, t0: -1, endAt: 0, ran: false, away: true, demoT: 0, vh: 800, jit: 12, tight: false,
  cued: -1, aLive: false, liveOn: false, chips: false, noEnd: false, noIntro: false, chipEls: [], blend: null, armed: false, badgeEls: null, longTitle: '', trackPos: [],
  atl: false, kf: null, camMode: '', keysWith: null,
  angles: [{ id: 'wheel', name: 'the wheel' }, { id: 'fall', name: 'the fall' }, { id: 'blend', name: 'a blend' }],
  async mount(root, ctx) {
    const lslot = root.parentElement && root.parentElement.querySelector('.legend-slot');
    if (lslot) ctx.legend(lslot, 'prov');
    const st = document.createElement('style');
    st.textContent = 'section[data-room="make"] .mk{position:absolute;inset:0;pointer-events:none}' /* full-screen wrapper: it must not swallow clicks meant for the wall text underneath; its controls opt back in */
      + 'section[data-room="make"] .mk button,section[data-room="make"] .mk input,section[data-room="make"] .mk a,section[data-room="make"] .mk [role="button"]{pointer-events:auto}'
      + 'section[data-room="make"] .mk-text{position:absolute;display:flex;flex-direction:column;gap:6px;pointer-events:none;transition:top .5s ease}'
      /* height 0 rather than display:none, so the opacity fade in beat two still runs. it is the one line in
         this block that never shares the screen with the wheel, so it must not hold a 40px hole open under it */
      + 'section[data-room="make"] .mk-huge{margin:0;height:0;overflow:hidden;font:600 clamp(40px,8vw,84px)/1 var(--mono);letter-spacing:-.03em;color:var(--mint2);opacity:0;transition:opacity .45s ease}'
      + 'section[data-room="make"] .mk-huge.on{opacity:1;height:auto;margin:0 0 2px}'
      + '@media (prefers-reduced-motion:reduce){section[data-room="make"] .mk-huge{transition:none}}'
      + 'section[data-room="make"] .mk-intro{margin:0;font:400 13px/1.5 -apple-system,BlinkMacSystemFont,sans-serif;color:var(--mute);max-width:30rem}'
      + 'section[data-room="make"] .mk-now{margin:0;font:600 12px/1.4 var(--mono);letter-spacing:.02em;color:var(--mint2)}'
      + 'section[data-room="make"] .mk-next{margin:0;font:400 12px/1.4 var(--mono);color:var(--mute)}'
      + 'section[data-room="make"] .mk-end{margin:0;font:400 11px/1.45 var(--mono);color:var(--mute);max-width:30rem}'
      /* the mixing desk. ice = the queued deck and the control that acts on it (reserved neutral-UI hue);
         mint = the deck that is sounding (reserved: the tapped share, which is what all 22 tracks came out of) */
      + 'section[data-room="make"] .mk-desk{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:3px;pointer-events:auto}'
      + 'section[data-room="make"] .mk-blend{flex:none;font:600 10px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--bg);background:var(--ice);border:1px solid var(--ice);border-radius:2px;padding:10px 13px;min-height:34px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}'
      + 'section[data-room="make"] .mk-blend:disabled{background:transparent;color:var(--mute);border-color:var(--line);cursor:default}'
      + 'section[data-room="make"] .mk-blend:focus-visible{outline:2px solid var(--ice);outline-offset:3px}'
      + 'section[data-room="make"] .mk-ab{margin:0;flex:1 1 15rem;font:400 12px/1.45 var(--mono);color:var(--mute);max-width:34rem}'
      + 'section[data-room="make"] .mk-hide .mk-desk{display:none}'
      + 'section[data-room="make"] .mk-tight .mk-now,section[data-room="make"] .mk-tight .mk-next{display:none}'
      + 'section[data-room="make"] .mk-marks{position:absolute;inset:0;pointer-events:none}'
      + 'section[data-room="make"] .mk-hit{position:absolute;display:none;pointer-events:auto;-webkit-tap-highlight-color:transparent}'
      + 'section[data-room="make"] .mk-hide .mk-hit{pointer-events:none}'
      + 'section[data-room="make"] .mk-badge{position:absolute;transform:translate(-50%,-50%);min-width:16px;height:16px;border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 5px;font:700 9px/1 var(--mono);letter-spacing:.04em;color:var(--bg);opacity:0;transition:opacity .28s ease}'
      + 'section[data-room="make"] .mk-badge.on{opacity:1}'
      + 'section[data-room="make"] .mk-badge[data-d="a"]{background:var(--mint)}'
      + 'section[data-room="make"] .mk-badge[data-d="b"]{background:var(--ice)}'
      + 'section[data-room="make"] .mk-trk[data-deck="b"]{border-color:var(--ice);box-shadow:0 0 0 3px rgba(134,203,254,.16)}'
      + '@media (max-width:560px){section[data-room="make"] .mk-text{gap:5px}section[data-room="make"] .mk-intro{font-size:12px;line-height:1.42}section[data-room="make"] .mk-next{font-size:11px}section[data-room="make"] .mk-end{font-size:10.5px}section[data-room="make"] .mk-ab{font-size:11px;line-height:1.4}section[data-room="make"] .mk-desk{gap:8px;margin-top:1px}section[data-room="make"] .mk-blend{padding:9px 11px;min-height:32px}}'
      + 'section[data-room="make"] .mk-labels{position:absolute;inset:0;pointer-events:none;transition:opacity .6s ease}'
      + 'section[data-room="make"] .mk-kl{position:absolute;transform:translate(-50%,-50%);font:600 11px/1 var(--mono);letter-spacing:.04em;color:var(--mute);background:rgba(10,1,24,.8);padding:2px 3px;border-radius:2px;white-space:nowrap}'
      /* the cluster layer covers the whole room, so it must not be the thing that catches a click: only the
         circles inside it take the pointer, or it sits on top of the desk and swallows the blend control */
      + 'section[data-room="make"] .mk-btns{position:absolute;inset:0;pointer-events:none;transition:opacity .6s ease}'
      + 'section[data-room="make"] .mk-hide .mk-labels,section[data-room="make"] .mk-hide .mk-btns{opacity:0}'
      + 'section[data-room="make"] .mk-trk{position:absolute;pointer-events:auto;width:44px;height:44px;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(189,166,255,.22);background:transparent;padding:0;margin:0;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}'
      + 'section[data-room="make"] .mk-trk:hover{border-color:var(--mint2)}'
      + 'section[data-room="make"] .mk-trk:focus-visible{outline:2px solid var(--mint);outline-offset:3px;border-color:var(--mint)}'
      + 'section[data-room="make"] .mk-trk:disabled{cursor:default}'
      + 'section[data-room="make"] .mk-trk[aria-pressed="true"]{border-color:var(--mint);box-shadow:0 0 0 3px rgba(33,246,188,.16)}'
      /* the phone picker: the same 22 tracks as a strip of 44px chips sorted by key, under a wheel that is then only a picture.
         it scrolls sideways, so an up or down swipe on it still walks the rooms. these are today's rules, and ?atlas=0 keeps
         them to the pixel; the atlas pages them (below) */
      + 'section[data-room="make"] .mk-chips{display:none;position:relative;grid-auto-flow:column;grid-template-rows:repeat(var(--rows,2),44px);grid-auto-columns:max-content;gap:5px 6px;margin:1px 0 2px;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scroll-snap-type:x proximity;scrollbar-width:none;pointer-events:auto;-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 30px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 30px),transparent)}'
      + 'section[data-room="make"] .mk-chips::-webkit-scrollbar{display:none}'
      + 'section[data-room="make"] .mk-chips.at-end{-webkit-mask-image:none;mask-image:none}'
      + 'section[data-room="make"] .mk-chipmode .mk-chips{display:grid}'
      + 'section[data-room="make"] .mk-hide .mk-chips{display:none}'
      + 'section[data-room="make"] .mk-chip{scroll-snap-align:start;height:44px;min-width:44px;padding:0 12px;margin:0;border:1px solid var(--line);border-radius:3px;background:rgba(10,1,24,.78);color:var(--ink);font:500 12px/1 var(--mono);text-align:left;white-space:nowrap;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}'
      + 'section[data-room="make"] .mk-chip .mk-ck{color:var(--mute);margin-right:7px}'
      + 'section[data-room="make"] .mk-chipbar{display:none}'
      /* atlas (round 2, W36: the chips ran off both sides of the phone): two chip columns fill the text column exactly (--cw,
         whole px, set in layout) and every column is a mandatory snap point, so at rest no chip is ever cut by an edge. a
         title too long for its chip ends in an ellipsis; the desk line spells out whatever is loaded. a slim bar under the
         pages says where in the 22 you are, in place of the fade */
      + 'html.atlas section[data-room="make"] .mk-chips{grid-auto-columns:var(--cw,160px);margin:1px 0 0;scroll-snap-type:x mandatory;-webkit-mask-image:none;mask-image:none}'
      + 'html.atlas section[data-room="make"] .mk-chip{display:flex;align-items:center;min-width:0;width:100%;padding:0 10px;overflow:hidden}'
      + 'html.atlas section[data-room="make"] .mk-chip .mk-ck{flex:none}'
      + 'html.atlas section[data-room="make"] .mk-chip .mk-ct{min-width:0;overflow:hidden;text-overflow:ellipsis}'
      + 'html.atlas section[data-room="make"] .mk-chipbar{position:relative;height:2px;margin:5px 0 2px;border-radius:1px;background:rgba(134,203,254,.14);overflow:hidden;pointer-events:none}'
      + 'html.atlas section[data-room="make"] .mk-chipmode .mk-chipbar{display:block}'
      + 'html.atlas section[data-room="make"] .mk-hide .mk-chipbar{display:none}'
      + 'html.atlas section[data-room="make"] .mk-chipbar i{position:absolute;left:0;top:0;height:100%;width:0;border-radius:1px;background:rgba(134,203,254,.72)}'
      + 'section[data-room="make"] .mk-chip[aria-pressed="true"]{border-color:var(--mint);box-shadow:inset 0 0 0 1px var(--mint)}'
      + 'section[data-room="make"] .mk-chip[aria-pressed="true"] .mk-ck{color:var(--mint)}'
      + 'section[data-room="make"] .mk-chip[data-deck="b"]{border-color:var(--ice);box-shadow:inset 0 0 0 1px var(--ice)}'
      + 'section[data-room="make"] .mk-chip[data-deck="b"] .mk-ck{color:var(--ice)}'
      + 'section[data-room="make"] .mk-chip:focus-visible{outline:2px solid var(--ice);outline-offset:2px}'
      + 'section[data-room="make"] .mk-chip:disabled{cursor:default}'
      + 'section[data-room="make"] .mk-chipmode .mk-blend{min-height:44px;padding:0 14px}'
      + 'section[data-room="make"] .mk-chipmode .mk-trk{border-color:transparent;box-shadow:none}' /* the wheel is only a picture here: no ring of overlapping outlines */
      /* the nearest-centre tap layer is on (a touch screen, or a tight wheel): the clusters themselves are the targets, so
         the resting outlines, which overlap round the inner ring there, give way; the decks keep theirs */
      + 'html.atlas section[data-room="make"] .mk-hitmode .mk-trk:not([aria-pressed="true"]):not([data-deck]){border-color:transparent}'
      + '@media (prefers-reduced-motion:reduce){section[data-room="make"] .mk-chips{scroll-behavior:auto}}'
      + '@media (prefers-reduced-motion:reduce){section[data-room="make"] .mk-labels,section[data-room="make"] .mk-btns,section[data-room="make"] .mk-text,section[data-room="make"] .mk-badge{transition:none}}'
      /* atlas: a key that holds a track is named by its [ label ]; the key text stays only on the empty keys, dimmer */
      + 'html.atlas section[data-room="make"] .mk-kl.mk-has{visibility:hidden}' /* laid out, unpainted: its text box is where the label's text goes */
      + 'html.atlas section[data-room="make"] .mk-kl{color:rgba(164,155,189,.55);background:none;font-weight:500}'
      /* a key whose label the label layer could not place (decluttered away, or labels switched off) keeps today's plain name */
      + 'html.atlas section[data-room="make"] .mk-kl.mk-has.mk-bare{visibility:visible;color:var(--mute);font-weight:600}'
      /* the 64px lift under the wall text is for today's bottom-anchored landscape wall. the atlas hangs the wall from the
         info block instead, where a short landscape phone makes it a scroll box whose padding cannot shrink, so the lift
         pushed its box past the bottom of the screen */
      + '@media (min-aspect-ratio:115/100){html.atlas section[data-room="make"] .wall{padding-bottom:0}}'
      /* while this stop is up, its unbracketed labels (the keys, the decks) track like today's key text (.04em, not .14em),
         so a key label's text is the same width as the text it stands in for and sits on it to the pixel */
      + 'html.atlas.mk-keys #atlas-labels .lab.region{letter-spacing:.04em}';
    document.head.appendChild(st);
    let data = null;
    try { data = await ctx.data('tracks'); } catch (e) {}
    try { await ctx.identity(); } catch (e) {} /* every dot needs its prov before the finale can sort the wall */
    const wrap = document.createElement('div'); wrap.className = 'mk'; root.appendChild(wrap); this.wrap = wrap; this.root = root;
    /* defined unconditionally, even on the load-failure path below, since enter() always registers it */
    this._onDemoBreak = () => { if (this.active) this.stopDemo(); };
    const tracks = data && data.tracks ? data.tracks : [];
    if (!tracks.length) { const p = document.createElement('p'); p.className = 'mk-intro'; p.textContent = 'the track list did not load. reload to try again.'; wrap.appendChild(p); return; }
    this.tracks = tracks.map((t) => Object.assign({}, t, parseKey(t.k)));
    this.playing = Math.max(0, this.tracks.findIndex((t) => t.f === 'reach-back'));

    /* provenance ranks: tapped dots first, then shuffled, then served — the same three-band order room 01 sorts into.
       counting sort, so the 19/81 split below is counted off P.prov (assigned by the shell from exhibit/data/wall.json) */
    const P = ctx.particles, n = P.n, prov = P.prov, cnt = [0, 0, 0];
    for (let i = 0; i < n; i++) cnt[prov[i]]++;
    const off = [0, cnt[0], cnt[0] + cnt[1]], order = new Uint32Array(n);
    for (let i = 0; i < n; i++) order[i] = off[prov[i]]++;
    this.order = order; this.tapCount = cnt[0];
    const tapPct = Math.round(cnt[0] / n * 100), restPct = 100 - tapPct; /* 19 / 81 — matches wall.json pct_rounded.tap = 19 */
    this.restPct = restPct;
    const word = WORDS[this.tracks.length] || String(this.tracks.length), yrs = atlasOn(ctx) ? 'the whole log' : 'seven years';
    this.lines = [
      'the wall again. ' + yrs + ', sorted.',
      'the queue or shuffle started all of that. it is leaving.',
      'what is left is the ' + tapPct + '% i tapped. i made ' + word + ' tracks out of the whole log anyway.',
    ];
    /* short screens: middle clause dropped */
    this.short = ['the wall again. ' + yrs + ', sorted.', 'the queue or shuffle started all of that.', 'what is left is the ' + tapPct + '% i tapped. ' + word + ' tracks.'];
    this.closings0 = ['that was the last of the eight rooms. the wheel stays up for as long as you want it.', 'that was the last of the eight rooms.'];
    this.closings = atlasOn(ctx) ? ['that was the last stop. the wheel stays up for as long as you want it.', 'that was the last stop.'] : this.closings0;
    this.longTitle = this.tracks.reduce((m, t) => (t.t.length > m.length ? t.t : m), '');

    const text = document.createElement('div'); text.className = 'mk-text'; wrap.appendChild(text); this.textEl = text;
    const intro = document.createElement('p'); intro.className = 'mk-intro'; text.appendChild(intro); /* filled by the first beat, so no line flashes before the finale starts */
    const huge = document.createElement('p'); huge.className = 'mk-huge'; huge.setAttribute('aria-hidden', 'true'); text.insertBefore(huge, intro); this.hugeEl = huge; /* beat two's display number: decorative, the intro line still carries the sentence for AT */
    const now = document.createElement('p'); now.className = 'mk-now'; now.setAttribute('aria-live', 'off'); text.appendChild(now);
    const next = document.createElement('p'); next.className = 'mk-next'; text.appendChild(next);
    const chips = document.createElement('div'); chips.className = 'mk-chips'; chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'my twenty-two tracks, by key'); text.appendChild(chips); this.chipWrap = chips;
    /* K7: the chips and the desk are this room's controls, so no chrome hint and no label may sit on them */
    chips.setAttribute('data-keepout', '');
    const bar = document.createElement('div'); bar.className = 'mk-chipbar'; bar.setAttribute('aria-hidden', 'true'); bar.appendChild(document.createElement('i')); text.appendChild(bar); this.chipBar = bar;
    chips.addEventListener('scroll', () => { chips.classList.toggle('at-end', chips.scrollLeft + chips.clientWidth >= chips.scrollWidth - 2); this.chipPos(); }, { passive: true });
    /* the mixing desk: one control and one line that always says what the two decks hold */
    const desk = document.createElement('div'); desk.className = 'mk-desk'; desk.setAttribute('data-keepout', ''); text.appendChild(desk); this.deskEl = desk;
    const blend = document.createElement('button'); blend.type = 'button'; blend.className = 'mk-blend'; blend.textContent = 'blend'; blend.disabled = true;
    /* the button disables itself while the blend runs, which would drop keyboard focus to the page: hand it to deck b instead */
    blend.addEventListener('click', () => { const kb = document.activeElement === blend, b = this.cued; this.stopDemo(); this.doBlend(ctx); if (kb && this.blend) (this.chips ? this.chipEls : this.btnEls)[b].focus({ preventScroll: true }); });
    desk.appendChild(blend); this.blendBtn = blend;
    const ab = document.createElement('p'); ab.className = 'mk-ab'; ab.setAttribute('aria-live', 'off'); desk.appendChild(ab); this.abEl = ab;
    const end = document.createElement('p'); end.className = 'mk-end'; text.appendChild(end);
    /* arriving fills every line at once, on top of the heading focus: nothing is announced until the visitor
       presses something in here, and then only the two lines that answer that press */
    const wake = () => { if (!this.liveOn) this.setLive(true); };
    wrap.addEventListener('pointerdown', wake, true); wrap.addEventListener('keydown', wake, true);
    this.introEl = intro; this.nowEl = now; this.nextEl = next; this.endEl = end;

    const labels = document.createElement('div'); labels.className = 'mk-labels'; labels.setAttribute('aria-hidden', 'true'); wrap.appendChild(labels); this.labelWrap = labels;
    this.labelEls = [];
    this.keysWith = new Set(this.tracks.map((t) => t.k));
    this.keySpan = {};
    for (let k = 1; k <= 12; k++) for (const L of ['A', 'B']) { const s = document.createElement('span'); s.className = 'mk-kl' + (this.keysWith.has(k + L) ? ' mk-has' : ''); s.textContent = k + L; labels.appendChild(s); this.labelEls.push({ el: s, num: k, letter: L }); this.keySpan[k + L] = s; }

    const btns = document.createElement('div'); btns.className = 'mk-btns'; wrap.appendChild(btns); this.btnWrap = btns;
    this.btnEls = this.tracks.map((t, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mk-trk';
      b.setAttribute('aria-label', 'play ' + t.t + ', key ' + t.k + ', ' + t.bpm + ' bpm');
      /* e.detail === 0 means the button was fired from the keyboard, not a pointer: only then is it kind
         to move focus onto the blend control, so a tab-and-enter visitor is not left hunting for it */
      b.addEventListener('click', (e) => { this.stopDemo(); this.tap(i, ctx, e.detail === 0); });
      btns.appendChild(b); return b;
    });
    const byKey = this.tracks.map((t, i) => i).sort((a, b) => { const A = this.tracks[a], B = this.tracks[b]; return A.num - B.num || A.letter.localeCompare(B.letter) || A.t.localeCompare(B.t); });
    this.chipEls = [];
    byKey.forEach((i) => {
      const t = this.tracks[i], b = document.createElement('button'); b.type = 'button'; b.className = 'mk-chip';
      const k = document.createElement('span'); k.className = 'mk-ck'; k.textContent = t.k; b.appendChild(k);
      const tt = document.createElement('span'); tt.className = 'mk-ct'; tt.textContent = ' ' + t.t; b.appendChild(tt);
      b.addEventListener('click', (e) => { this.stopDemo(); this.tap(i, ctx, e.detail === 0); });
      chips.appendChild(b); this.chipEls[i] = b;
    });
    /* on a phone the wheel is small enough that fifteen minor-key clusters do not fit round the inner ring
       without their 28px circles covering each other's centres, and a tap then opens whichever button happens
       to be later in the dom. this layer sits over the wheel alone (never over the desk) and hands the tap to
       the nearest cluster centre instead. desktop leaves it off, so the circles keep their own hover. */
    const hit = document.createElement('div'); hit.className = 'mk-hit'; hit.setAttribute('aria-hidden', 'true'); wrap.appendChild(hit); this.hitEl = hit;
    /* atlas: one input path (§1.4). the layer is bound through ctx.gesture, which hands it world coordinates, so the
       nearest-centre pick stays right under any zoom; the native click below is never attached there */
    if (atlasOn(ctx)) ctx.gesture.bind(hit, { tap: (p) => { this.hitTap(p.wx, p.wy, ctx); return true; }, drag: 'camera' });
    else hit.addEventListener('click', (e) => {
      if (!this.armed) return;
      let best = -1, bd = Infinity;
      this.trackPos.forEach((p, i) => { const d = (p.x - e.clientX) * (p.x - e.clientX) + (p.y - e.clientY) * (p.y - e.clientY); if (d < bd) { bd = d; best = i; } });
      const lim = this.bs * 0.9 + this.jit; /* a tap in the hole in the middle, or outside the rings, is not a pick */
      if (best < 0 || bd > lim * lim) return;
      this.stopDemo(); this.tap(best, ctx, false);
    });
    const marks = document.createElement('div'); marks.className = 'mk-marks'; marks.setAttribute('aria-hidden', 'true'); wrap.appendChild(marks);
    this.badgeEls = ['a', 'b'].map((d) => { const s = document.createElement('span'); s.className = 'mk-badge'; s.dataset.d = d; s.textContent = d; marks.appendChild(s); return s; });
    this.trackPos = this.tracks.map(() => ({ x: 0, y: 0 }));
    /* atlas: the wheel's world-anchored dom moves into the camera's css layer as four whole containers, in document
       order, so the tab order through the 22 circles is exactly today's (§1.5) */
    if (atlasOn(ctx)) { try { ctx.view.layer(wrap, [labels, btns, hit, marks]); } catch (e) {} }
    /* the key labels are centred from a measured box: measure again once the webfont is in */
    if (atlasOn(ctx) && document.fonts && document.fonts.ready) document.fonts.ready.then(() => { this.kcorr = null; this.kz = 0; if (this.active && this.atl && this.beat === 3) this.atlasLabels(ctx); }).catch(() => {});
    this.ready = true;
  },
  /* ---- layout ------------------------------------------------------------------ */
  layout(ctx) {
    const s = ctx.stage(); this.s = s; this.vh = innerHeight;
    /* two chip columns fill the text column exactly, in whole px (a fractional column would leave a sliver of the next one
       showing at a snap point) */
    this.chipWrap.style.setProperty('--cw', Math.max(44, Math.floor((s.w - 6) / 2)) + 'px');
    /* on a short screen the copy would squeeze the wheel to nothing, so tight mode drops the two lines the
       desk already says (the track under the needle, and the next one in my order) and shortens the rest.
       a phone that keeps all of it ends up with a wheel 84px across and clusters that cover each other. */
    this.chipMode(false, 2, false, false);
    this.tight = false; this.wrap.classList.remove('mk-tight'); let textH = this.reserve(s);
    if (s.h - textH - 10 < 188) { this.tight = true; this.wrap.classList.add('mk-tight'); textH = this.reserve(s); }
    /* below a certain size the ring of key labels is illegible and lands on top of the clusters, so the small
       wheel drops it and takes the space back. the margin is what the labels and the top half of a button need */
    const geo = (th) => {
      const availH = Math.max(this.chips ? 90 : 120, s.h - th - 10), R0 = Math.min(s.w / 2 - 24, (availH - 36) / 2), lab = R0 >= 78, M = lab ? 30 : 18;
      const R = Math.max(36, Math.min(s.w / 2 - (lab ? 34 : 24), (availH - M * 2) / 2)), rIn = R * (this.tight ? 0.66 : 0.6);
      return { availH, lab, R, rIn, bs: Math.max(28, Math.min(44, Math.round(Math.min(R * 0.4, rIn * 0.52)))) };
    };
    let G = geo(textH);
    /* a wheel whose circles are under 44px, or closer together than that, cannot be pressed with a thumb: it stays
       as the picture and the strip of chips under it takes the taps. the copy gives way first, then a chip row */
    if (G.bs < 44 || G.rIn * TAU / 11 < 44) {
      this.tight = true; this.wrap.classList.add('mk-tight');
      const tries = [[2, false, false], [2, true, false], [2, true, true], [1, true, true]];
      for (let k = 0; k < tries.length; k++) { this.chipMode(true, ...tries[k]); textH = this.reserve(s); if (s.h - textH - 10 >= 110) break; }
      G = geo(textH);
    }
    const availH = G.availH, R = G.R;
    this.showLabels = G.lab;
    this.labelWrap.style.display = this.showLabels ? '' : 'none';
    const cx = s.x + s.w / 2, cy = s.y + availH / 2;
    this.cx = cx; this.cy = cy; this.rIn = R * (this.tight ? 0.66 : 0.6); this.rOut = R;
    this.jit = Math.max(5, Math.min(15, R * 0.14)); /* cluster radius: on a small wheel the clusters have to shrink too, or they merge into one ring */
    /* the outer ring's own radius always gives its 12 labels enough arc to stay legible (rOut >= rIn by construction);
       the inner ring is the one that gets tight on a narrow phone, so it is gated on its own radius, separately */
    this.showInner = this.rIn >= 64;
    const groups = {};
    this.tracks.forEach((t, i) => (groups[t.k] = groups[t.k] || []).push(i));
    /* two tracks in the same key sit either side of that key's angle, and a little in and out of their ring.
       the angle alone is not enough: a full 30 degrees is a whole slot, so the outer half of the 11A pair
       landed on exactly the same pixel as the inner half of the 10A pair and one of the two was unreachable. */
    const spread = Math.max(13, Math.min(24, (this.jit * 2 + 4) / this.rIn * 57.2958));
    const stag = Math.min(this.jit * 1.3, (this.rOut - this.rIn) * 0.35, 13);
    Object.values(groups).forEach((idxs) => idxs.forEach((i, gi) => {
      const t = this.tracks[i], k = idxs.length > 1 ? gi - (idxs.length - 1) / 2 : 0;
      const a = rad(ang(t.num) + k * spread), r = (t.letter === 'A' ? this.rIn : this.rOut) + k * stag;
      this.trackPos[i].x = cx + Math.cos(a) * r; this.trackPos[i].y = cy + Math.sin(a) * r;
    }));
    this.labelEls.forEach(({ el, num, letter }) => {
      const a = rad(ang(num)), r = letter === 'A' ? this.rIn - this.jit - 11 : this.rOut + this.jit + 9;
      el.style.left = (cx + Math.cos(a) * r) + 'px'; el.style.top = (cy + Math.sin(a) * r) + 'px';
      el.style.display = (letter === 'A' && !this.showInner) ? 'none' : '';
    });
    /* on a small phone the ring is tight: shrink the hit circles to the spacing between them (never under 28px) rather than let them cover each other's centres */
    const bs = G.bs;
    this.bs = bs;
    this.btnEls.forEach((b, i) => { b.style.width = b.style.height = bs + 'px'; b.style.left = this.trackPos[i].x + 'px'; b.style.top = this.trackPos[i].y + 'px'; });
    /* the nearest-centre tap layer, sized to the wheel and nothing else, and only where the circles actually collide */
    const hw = R + this.jit + bs / 2 + 2, on = this.tight || ctx.coarse;
    this.hitEl.style.display = on ? 'block' : 'none'; this.wrap.classList.toggle('mk-hitmode', on);
    if (on) { this.hitEl.style.left = (cx - hw) + 'px'; this.hitEl.style.top = (cy - hw) + 'px'; this.hitEl.style.width = this.hitEl.style.height = (hw * 2) + 'px'; }
    /* two resting places for the copy: hard against the bottom of the stage while the beats run (one line, and the
       wall needs every other pixel), and up where the four settled lines start once the wheel is there */
    this.textTop = s.y + s.h - textH; this.beatTop = s.y + s.h - this.lineH;
    this.textEl.style.left = s.x + 'px'; this.textEl.style.width = s.w + 'px';
    this.textEl.style.top = (this.beat > 0 && this.beat < 3 ? this.beatTop : this.textTop) + 'px';
    if (this.beat) this.introEl.textContent = this.line(this.beat - 1); /* a resize can flip the copy between its long and short form */
    if (this.endEl.textContent) this.endEl.textContent = this.closingText();
    if (this.nextEl.textContent) this.nextEl.textContent = this.nextLine(this.playing);
    this.marks(); this.vis();
    if (this.armed) this.showChip(this.playing, true);
    this.grid(ctx);
  },
  /* chip mode on or off, how many rows of chips, and which of the two optional lines give way to them */
  chipMode(on, rows, noEnd, noIntro) {
    this.chips = on; this.noEnd = on && noEnd; this.noIntro = on && noIntro;
    this.wrap.classList.toggle('mk-chipmode', on); this.chipWrap.style.setProperty('--rows', rows);
    this.btnWrap.inert = on; /* the circles are under the tap layer and under 44px: the chips are the controls */
  },
  vis() {
    this.introEl.style.display = this.noIntro && this.armed ? 'none' : '';
    this.endEl.style.display = this.noEnd ? 'none' : '';
  },
  setLive(on) { this.liveOn = on; [this.nowEl, this.abEl].forEach((e) => e.setAttribute('aria-live', on ? 'polite' : 'off')); },
  /* slide the strip so a deck's chip is in view (the demo and the arrival pick for you, off screen otherwise) */
  showChip(i, instant) {
    if (!this.chips || i < 0 || !this.chipEls[i]) return;
    if (!this.atl) { /* ?atlas=0: today's free strip, unchanged */
      const w = this.chipWrap, el = this.chipEls[i], l = el.offsetLeft, r = l + el.offsetWidth;
      if (l >= w.scrollLeft && r <= w.scrollLeft + w.clientWidth - 30) return;
      const left = Math.max(0, l - 8);
      if (instant || this.reducedM) w.scrollLeft = left; else w.scrollTo({ left, behavior: 'smooth' });
      return;
    }
    const w = this.chipWrap, wr = w.getBoundingClientRect(), er = this.chipEls[i].getBoundingClientRect(); if (!wr.width) return;
    /* the chip's column start in scroll coordinates (a snap point): already on the page, or the page that starts there */
    const l = er.left - wr.left + w.scrollLeft, r = l + er.width;
    if (l >= w.scrollLeft - 1 && r <= w.scrollLeft + w.clientWidth + 1) { this.chipPos(); return; }
    const left = Math.max(0, Math.min(w.scrollWidth - w.clientWidth, l));
    if (instant || this.reducedM) w.scrollLeft = left; else w.scrollTo({ left, behavior: 'smooth' });
    this.chipPos();
  },
  /* the bar under the chips: its thumb is the visible share of the 22, at the scroll position */
  chipPos() {
    const w = this.chipWrap, bar = this.chipBar, th = bar && bar.firstChild; if (!th || !w.scrollWidth) return;
    th.style.width = (100 * Math.min(1, w.clientWidth / w.scrollWidth)).toFixed(2) + '%';
    th.style.transform = 'translateX(' + (w.scrollLeft / w.scrollWidth * bar.clientWidth).toFixed(1) + 'px)';
  },
  /* measure the text block at its tallest, so it can never grow down into the .wall copy underneath */
  reserve(s) {
    /* this runs on every layout() — including a debounced resize while the room just sits there — so the three
       aria-live regions must not announce the throwaway candidate strings below; silence them for the measurement */
    const t = this.textEl, liveEls = [this.nowEl, this.abEl];
    liveEls.forEach((e) => e.setAttribute('aria-live', 'off'));
    const keep = [this.introEl.textContent, this.nowEl.textContent, this.nextEl.textContent, this.endEl.textContent, this.hugeEl.textContent, this.abEl.textContent];
    t.style.left = s.x + 'px'; t.style.width = s.w + 'px';
    let nx = '', nw = '';
    for (let i = 0; i < this.tracks.length; i++) { const a = this.nextLine(i), b = this.nowLine(i); if (a.length > nx.length) nx = a; if (b.length > nw.length) nw = b; }
    this.introEl.textContent = this.line(2); this.nowEl.textContent = nw;
    this.nextEl.textContent = nx; this.endEl.textContent = this.reserveClosing();
    this.hugeEl.textContent = this.restPct + '%';
    /* the desk is display:none while the three beats run, so it is forced back for the measurement: the settled
       room has to reserve room for it or the desk would grow down into the wall copy when the wheel arrives.
       the two tall states never happen together (the desk line replaces the album-order line), so measure both.
       the big display number is the mirror case: it only ever shows during beat two, while the wheel is not
       there, so it is taken out of this measurement and put back for the beat one below. */
    this.deskEl.style.display = 'flex'; this.abEl.textContent = '';
    this.chipWrap.style.display = this.chips ? 'grid' : ''; this.chipBar.style.display = this.chips && this.atl ? 'block' : ''; this.introEl.style.display = this.noIntro ? 'none' : ''; this.endEl.style.display = this.noEnd ? 'none' : '';
    const h1 = t.offsetHeight;
    this.nextEl.textContent = ''; this.abEl.textContent = this.worstAb();
    const h = Math.max(h1, t.offsetHeight);
    /* and again with the one beat line alone, plus the display number at its full height: that pair is all
       the copy the wall has to leave room for while the three beats run */
    let lg = ''; for (let i = 0; i < 3; i++) { const v = this.line(i); if (v.length > lg.length) lg = v; }
    this.deskEl.style.display = 'none'; this.chipWrap.style.display = 'none'; this.chipBar.style.display = 'none'; this.introEl.style.display = ''; this.hugeEl.style.height = 'auto'; this.hugeEl.style.marginBottom = '2px';
    this.nowEl.textContent = this.nextEl.textContent = this.endEl.textContent = this.abEl.textContent = ''; this.introEl.textContent = lg;
    this.lineH = t.offsetHeight;
    this.deskEl.style.display = ''; this.chipWrap.style.display = ''; this.chipBar.style.display = ''; this.hugeEl.style.height = ''; this.hugeEl.style.marginBottom = '';
    this.introEl.textContent = keep[0]; this.nowEl.textContent = keep[1]; this.nextEl.textContent = keep[2]; this.endEl.textContent = keep[3]; this.hugeEl.textContent = keep[4]; this.abEl.textContent = keep[5];
    this.vis();
    requestAnimationFrame(() => this.setLive(!!this.liveOn));
    return h;
  },
  /* the tallest the desk line can ever be, so reserve() measures the worst case rather than the current one */
  worstAb() {
    const t = this.longTitle;
    const c = this.tight
      ? ['blending into ' + t + '. a long way round. sound is off.', 'b: ' + t + ' · 12B. relative major/minor, 172 to 129 bpm.', 'a: ' + t + ' · 12B · 172 bpm. tap a second.']
      : ['blending ' + t + ' into ' + t + '. a long way round: the engine dissolves instead of blending. sound is off.', 'deck b: ' + t + ' (12B). a long way round: the engine dissolves instead of blending. 172 to 129 bpm.'];
    return c.reduce((m, v) => (v.length > m.length ? v : m), '');
  },
  /* the wall grid from room 01, duplicated here on purpose (rooms do not import each other) so the
     finale re-forms the same pixel-exact rectangle: a whole number of device pixels per cell, or it moires */
  grid(ctx) {
    const s = this.s, P = ctx.particles, n = P.n, d = P.dpr, wh = Math.max(80, this.beatTop - s.y - 12);
    let cell = Math.max(2, Math.floor(Math.sqrt((s.w * d) * (wh * d) / n)));
    let cols = Math.floor((s.w * d) / cell), rows = Math.ceil(n / cols);
    while (rows * cell > wh * d && cell > 2) { cell--; cols = Math.floor((s.w * d) / cell); rows = Math.ceil(n / cols); }
    const maxRows = Math.floor((wh * d) / cell); if (rows > maxRows) rows = maxRows;
    this.wcell = cell / d; this.wcols = cols; this.wrows = rows; this.wcap = cols * rows;
    this.wox = s.x + (s.w - cols * this.wcell) / 2; this.woy = s.y;
  },
  /* ---- the wheel --------------------------------------------------------------- */
  /* which part of the wheel a dot belongs to: -1 inner rim, -2 outer rim, else a track index.
     keyed off the dot's rank among the tapped dots, so the wheel is built from that ~19% alone */
  slot(i, ctx) {
    const k = this.order[i], h = ctx.hash;
    if (h(k * 2 + 1) < RIM) return h(k * 3 + 1) < 0.5 ? -1 : -2;
    return Math.floor(h(k * 5 + 2) * this.tracks.length);
  },
  layoutParticles(ctx) {
    const P = ctx.particles, prov = P.prov, tp = this.trackPos, cx = this.cx, cy = this.cy, rIn = this.rIn, rOut = this.rOut;
    const hash = ctx.hash, jit = this.jit, cos = Math.cos, sin = Math.sin;
    P.targetPx((i) => {
      if (prov[i] !== 0) return null; /* the queue's plays are out of the picture now: parked off-screen */
      const s = this.slot(i, ctx);
      if (s < 0) { const a = hash(i * 5 + 2) * TAU, r = s === -1 ? rIn : rOut; return [cx + cos(a) * r, cy + sin(a) * r]; }
      const p = tp[s], jr = hash(i * 7 + 9) * jit, ja = hash(i * 11 + 13) * TAU;
      return [p.x + cos(ja) * jr, p.y + sin(ja) * jr];
    });
  },
  /* every dot on the wheel is a play i tapped, so the whole wheel is mint: dimmed at rest, full for the one
     sounding, mint2 for its harmonic neighbours, ice for the deck you have queued. the ring a cluster sits in
     already says whether its key is minor or major, so the two rims are the same mint at lower weight. */
  paint(ctx) {
    const P = ctx.particles, prov = P.prov, PAL = ctx.PAL, playing = this.playing, cued = this.cued, nb = this.kf ? this.kf.set : this.neighborSet;
    const rim = mix(PAL.bg, PAL.tap, 0.3), rest = mix(PAL.bg, PAL.tap, 0.55);
    P.color((i) => {
      if (prov[i] !== 0) return PAL.bg;
      const s = this.slot(i, ctx);
      if (s < 0) return rim;
      if (s === playing) return PAL.tap;
      if (s === cued) return PAL.ice;
      if (nb && nb.has(s)) return PAL.mint2;
      return rest;
    });
  },
  line(k) { return (this.tight ? this.short : this.lines)[k]; },
  nowLine(i) { const t = this.tracks[i]; return 'now: ' + t.t + ' · ' + t.k + ' · ' + t.bpm + ' bpm'; },
  /* "the last stop" is true of the walk (make is its last stop), and of a tour only on its own last stop: on a tour, played
     or paused (round 2b: a paused grand tour printed it on stop 10 of 12), the wheel is one stop of several, so no closing
     line is printed there */
  closingText() { const T = this.atl && this.ctx && this.ctx.tour, a = T && T.active; return a && a.id && a.k < a.n - 1 ? '' : this.closings[this.tight ? 1 : 0]; },
  /* the layout reserves room for the longer of the two closing lines. the atlas one is shorter and wraps a line
     less; measuring it would move the wheel, its caption and every key name (D3: numbers stay put across modes) */
  reserveClosing() { const a = this.closingText(), b = this.closings0[this.tight ? 1 : 0]; return b.length > a.length ? b : a; },
  /* the album order, described in the same four words the desk uses for a pair you choose yourself */
  nextLine(i) {
    const n = this.tracks.length, j = (i + 1) % n, nx = this.tracks[j], head = 'next in my order: ' + nx.t + ' (' + nx.k + ')';
    return this.tight ? head + '.' : head + '. ' + this.relation(i, j).full;
  },
  select(i, ctx, doPlay) {
    const t = this.tracks[i], prev = this.playing; this.playing = i;
    const nb = new Set();
    for (let k = 0; k < this.tracks.length; k++) if (k !== i && adjKey(t, this.tracks[k])) nb.add(k);
    this.neighborSet = nb;
    this.paint(ctx);
    this.btnEls.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    this.chipEls.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    this.showChip(i, false);
    this.nowEl.textContent = this.nowLine(i);
    this.nextEl.textContent = this.nextLine(i);
    /* the shell replays room.track every time this room becomes the active one again: keep it on whatever
       the visitor last put under the needle, not on the track the module shipped with */
    if (doPlay) { this.track = t.f; ctx.audio.play(t.f, prev >= 0 && prev !== i ? this.relation(prev, i).xf : 0.9); }
  },
  /* ---- the mixing desk --------------------------------------------------------- */
  /* the camelot relationship between two of my tracks, and the crossfade the engine gives it. the four
     cases and the three time constants are the same ones exhibit/shell.js xfade() uses between rooms. */
  relation(i, j) {
    const a = this.tracks[i], b = this.tracks[j];
    const d = Math.min((a.num - b.num + 12) % 12, (b.num - a.num + 12) % 12), same = a.letter === b.letter;
    if (a.k === b.k) return { xf: 0.6, words: 'same key', full: 'same key, so the blend is direct.' };
    if (d === 0) return { xf: 0.9, words: 'relative major/minor', full: 'relative major and minor, so the blend holds.' };
    if (same && d === 1) return { xf: 0.9, words: 'one step round the wheel', full: 'one step round the wheel, so the blend is clean.' };
    return { xf: 1.8, words: 'a long way round', full: 'a long way round: the engine dissolves instead of blending.' };
  },
  bpmLine(i, j) { const a = this.tracks[i].bpm, b = this.tracks[j].bpm; return a === b ? 'both at ' + a + ' bpm.' : a + ' to ' + b + ' bpm.'; },
  /* a visitor's tap on a cluster. deck a is already loaded once the wheel settles, so a tap loads deck b,
     tapping deck b again puts it back down, and tapping deck a clears b and leaves a playing. */
  tap(i, ctx, fromKey) {
    if (this.kf) { this.kf = null; if (this.atl) ctx.hud(null); }
    if (this.blend) this.finishBlend(ctx);
    if (!this.aLive || i === this.playing) { this.cued = -1; this.aLive = true; this.select(i, ctx, true); }
    else if (i === this.cued) { this.cued = -1; this.paint(ctx); }
    else { this.cued = i; this.paint(ctx); }
    this.refreshDesk();
    if (fromKey && this.cued >= 0) this.blendBtn.focus();
  },
  /* on a tight screen this one line is the whole readout: the .mk-now and .mk-next lines are off, so it
     carries the key and the tempo of whichever deck it is talking about */
  deskLine() {
    const T = this.tracks, bl = this.blend;
    if (bl) return 'blending ' + (this.tight ? '' : T[bl.a].t + ' ') + 'into ' + T[bl.b].t + '. ' + (this.tight ? bl.rel.words + '.' : bl.rel.full) + (bl.silent ? ' sound is off.' : '');
    const a = T[this.playing];
    /* the wide screen already has the title on the line above, so this one says what to do rather than repeat it */
    if (this.cued < 0) return this.tight ? 'a: ' + a.t + ' · ' + a.k + ' · ' + a.bpm + ' bpm. tap a second.' : 'deck a. pick another.';
    const b = T[this.cued], rel = this.relation(this.playing, this.cued), bpm = this.bpmLine(this.playing, this.cued);
    return this.tight ? 'b: ' + b.t + ' · ' + b.k + '. ' + rel.words + ', ' + bpm : 'deck b: ' + b.t + ' (' + b.k + '). ' + rel.full + ' ' + bpm;
  },
  refreshDesk() {
    if (!this.abEl) return;
    this.abEl.textContent = this.deskLine();
    /* "next in my order" names a key relationship too. once the visitor has chosen their own pair, two of
       those sentences on screen at once are about different pairs, so the album-order one stands down. */
    this.nextEl.textContent = this.cued >= 0 || this.blend ? '' : this.nextLine(this.playing);
    const can = this.armed && this.cued >= 0 && !this.blend;
    this.blendBtn.disabled = !can;
    this.blendBtn.setAttribute('aria-label', can ? 'blend ' + this.tracks[this.playing].t + ' into ' + this.tracks[this.cued].t : 'blend: load a second track first');
    this.marks();
  },
  /* the two deck chips, sitting on the clusters they belong to */
  marks() {
    if (!this.badgeEls || !this.trackPos.length) return;
    const show = this.armed || !!this.blend;
    [this.playing, this.cued].forEach((k, n) => {
      const el = this.badgeEls[n], on = show && k >= 0 && (n === 0 || k !== this.playing);
      el.classList.toggle('on', !!on);
      if (on) { el.style.left = this.trackPos[k].x + 'px'; el.style.top = this.trackPos[k].y + 'px'; }
    });
    [this.btnEls, this.chipEls].forEach((L) => L.forEach((b, k) => { if (show && k === this.cued) b.dataset.deck = 'b'; else delete b.dataset.deck; }));
    if (this.atl && this.ctx) this.atlasLabels(this.ctx);
  },
  /* run the blend: the engine crossfades a into b at the time constant the key relationship earns, and the
     overlay walks a line round the wheel for as long as that takes. muted, the line and the words still run. */
  doBlend(ctx) {
    if (!this.ready || this.blend || this.cued < 0 || this.cued === this.playing) return;
    const a = this.playing, b = this.cued, rel = this.relation(a, b);
    const silent = !!(ctx.audio.muted || !ctx.audio.on);
    this.blend = { a, b, rel, silent, t0: -1, dur: rel.xf * 2200 };
    if (!silent) { this.track = this.tracks[b].f; ctx.audio.play(this.tracks[b].f, rel.xf); }
    this.refreshDesk();
  },
  finishBlend(ctx) {
    const bl = this.blend; if (!bl) return;
    this.blend = null; this.cued = -1;
    this.select(bl.b, ctx, false);
    this.refreshDesk();
  },
  arm(on) { this.armed = on; this.btnEls.concat(this.chipEls).forEach((b) => { b.disabled = !on; }); this.wrap.classList.toggle('mk-hide', !on); this.vis(); this.refreshDesk(); },
  /* ---- the finale -------------------------------------------------------------- */
  beatOne(ctx) {
    const P = ctx.particles, prov = P.prov, PROV = ctx.PROV;
    this.beat = 1; this.t0 = -1; this.endAt = 0;
    this.blend = null; this.cued = -1; this.aLive = false; /* the finale starts over, so the desk does too */
    this.arm(false); this.introEl.textContent = this.line(0); this.textEl.style.top = this.beatTop + 'px';
    this.nowEl.textContent = ''; this.nextEl.textContent = ''; this.endEl.textContent = ''; this.hugeEl.classList.remove('on');
    P.ease = 0.1; P.jitter = 0.28; P.big = false; P.swirl = 0.22;
    this.wallTargets(ctx);
    P.color((i) => PROV[prov[i]]);
    if (this.atl) this.atlasBeat(ctx);
  },
  wallTargets(ctx) {
    const P = ctx.particles, rows = this.wrows, cell = this.wcell, ox = this.wox, oy = this.woy;
    const order = this.order, cap = this.wcap, n = P.n, keep = cap >= n ? 1 : cap / n, floor = Math.floor;
    P.targetPx((i) => {
      let k = order[i];
      if (keep < 1) { const kk = floor(k * keep); if (floor((k + 1) * keep) === kk) return null; k = kk; }
      return [ox + floor(k / rows) * cell, oy + (k % rows) * cell];
    });
  },
  beatTwo(ctx, quiet) {
    const P = ctx.particles, prov = P.prov, X = P.x, hash = ctx.hash, PAL = ctx.PAL, floor = Math.floor;
    const rows = this.wrows, cell = this.wcell, ox = this.wox, oy = this.woy, order = this.order;
    const cap = this.wcap, n = P.n, keep = cap >= n ? 1 : cap / n, fy = this.vh + 170;
    this.beat = 2; this.introEl.textContent = this.line(1);
    this.hugeEl.textContent = this.restPct + '%'; this.hugeEl.classList.add('on');
    P.swirl = 0; P.ease = 0.045; /* straight down: a fall, not an arc */
    P.targetPx((i) => {
      if (prov[i] === 0) { let k = order[i]; if (keep < 1) { const kk = floor(k * keep); if (floor((k + 1) * keep) === kk) return null; k = kk; } return [ox + floor(k / rows) * cell, oy + (k % rows) * cell]; }
      return [X[i] + (hash(i * 13 + 7) - 0.5) * 22, fy + hash(i * 19 + 3) * 420];
    });
    /* not straight to the background: they keep a trace of their own colour on the way out, so the 81% is seen leaving rather than blinking off */
    const dim = [mix(PAL.bg, ctx.PROV[0], 0.3), mix(PAL.bg, ctx.PROV[1], 0.3), mix(PAL.bg, ctx.PROV[2], 0.3)];
    P.color((i) => (prov[i] === 0 ? PAL.tap : dim[prov[i]]));
    if (!quiet) ctx.audio.note(0, { dur: 1.7, vol: 0.045 });
    if (this.atl) this.atlasBeat(ctx);
  },
  beatThree(ctx, t, quiet) {
    const P = ctx.particles;
    this.beat = 3; P.swirl = 0.3; P.ease = 0.05; P.jitter = 0.5; P.big = true; /* fewer dots left: draw each one bigger */
    this.introEl.textContent = this.line(2); this.textEl.style.top = this.textTop + 'px'; this.hugeEl.classList.remove('on');
    this.layoutParticles(ctx); this.select(this.playing, ctx, false);
    /* deck a is already on the wheel with its badge, and it is this room's own bed: the first tap loads b rather than replacing a */
    this.aLive = true; this.arm(true); this.showChip(this.playing, true);
    if (this.atl) this.atlasBeat(ctx);
    this.endAt = (t || performance.now()) + SETTLE;
    if (!quiet) { ctx.audio.note(4, { dur: 1.9, vol: 0.04 }); ctx.audio.note(7, { at: 0.12, dur: 1.7, vol: 0.03 }); }
  },
  settled() { this.endAt = 0; this.endEl.textContent = this.closingText(); },
  /* ---- lifecycle --------------------------------------------------------------- */
  enter(ctx) {
    this.active = true; this.ctx = ctx; this.atl = atlasOn(ctx);
    if (this.atl) document.documentElement.classList.add('mk-keys');
    /* a tour starting or ending while the wheel is up changes whether the closing line is true */
    if (this.atl && !this.offTour && ctx.tour && ctx.tour.onChange) this.offTour = ctx.tour.onChange(() => { if (this.active && this.beat === 3 && !this.endAt && this.endEl) { const t = this.closingText(); if (this.endEl.textContent !== t) this.endEl.textContent = t; } });
    /* a real visitor's own pointer, touch or key anywhere in the document ends a running kiosk demo immediately — the
       same idiom game.js uses. the track-button click handler already covers one path; this covers everything else.
       attached here, removed in leave(), so nothing is listening while this room is not the one on screen. */
    document.addEventListener('pointerdown', this._onDemoBreak);
    document.addEventListener('touchstart', this._onDemoBreak, { passive: true });
    document.addEventListener('keydown', this._onDemoBreak);
    this.reducedM = ctx.reduced;
    const P = ctx.particles; P.ease = 0.05; P.jitter = 0.5; P.big = false; P.touch = false; /* the clusters are buttons; the pointer should not push them away */
    if (!this.ready) { P.scatter(); P.color(() => ctx.PAL.fog); return; }
    const fresh = this.away; this.away = false;
    this.layout(ctx);
    if (!this.ran) { /* first arrival in this visit: the three beats */
      this.ran = true;
      if (ctx.reduced) { this.beatThree(ctx, performance.now(), true); this.settled(); } else this.beatOne(ctx);
      return;
    }
    if (!fresh && this.beat === 1) { this.wallTargets(ctx); if (this.atl) this.atlasBeat(ctx); return; } /* a resize mid-finale keeps the clock and re-forms at the new size */
    if (!fresh && this.beat === 2) { this.beatTwo(ctx, true); return; }
    this.beatThree(ctx, performance.now(), !fresh); this.settled(); /* afterwards: the short version, straight to the wheel */
  },
  /* left mid-finale (a fast scroll, or the shell settling on the room at startup): it did not happen, so it plays again next time */
  leave(ctx) {
    this.active = false; this.stopDemo(); this.away = true; this.kf = null; this.camMode = '';
    if (this.offZoom) { this.offZoom(); this.offZoom = null; } clearTimeout(this.kfixT); clearTimeout(this.kfixT2);
    if (this.offTour) { try { this.offTour(); } catch (e) {} this.offTour = null; }
    document.documentElement.classList.remove('mk-keys');
    if (this.ready) this.setLive(false); /* leaving settles the desk and rewrites its lines: that is not news */
    if (this.blend) this.finishBlend(ctx); /* no frames run while this room is off screen, so settle the blend now rather than half-drawn */
    document.removeEventListener('pointerdown', this._onDemoBreak);
    document.removeEventListener('touchstart', this._onDemoBreak);
    document.removeEventListener('keydown', this._onDemoBreak);
    if (ctx && ctx.particles) ctx.particles.big = false; /* this room is the only one that asks for fat dots: hand the field back as it was */
    if (this.beat > 0 && this.beat < 3) { this.beat = 0; this.t0 = -1; this.ran = false; }
  },
  frame(g, t, bands, w, h, ctx) {
    if (!this.ready) return;
    if (this.beat === 1 || this.beat === 2) {
      if (this.t0 < 0) this.t0 = t;
      else if (this.beat === 1) { if (t - this.t0 >= B1) this.beatTwo(ctx); }
      else if (t - this.t0 >= B2) this.beatThree(ctx, t);
      return;
    }
    if (this.endAt && t >= this.endAt) this.settled();
    /* a key pill the layer drops later (a track name that came in over it) hands the key back to today's text, every
       half second: a key name never goes missing between the two (round 2b, webkit) */
    if (this.atl && t - (this.bareT || 0) >= 500) { this.bareT = t; this.keyBare(); }
    if (this.atl) this.drawKeys(g);
    if (this.playing < 0) return;
    const bl = this.blend;
    if (bl) {
      if (bl.t0 < 0) bl.t0 = t;
      const k = Math.min(1, (t - bl.t0) / bl.dur);
      /* constant speed: the head is meant to read as travelling, and an eased one sits still at both ends.
         reduced motion gets the whole route at once rather than a head walking round the wheel. */
      this.route(g, bl.a, bl.b, ctx.reduced ? 1 : k, !ctx.reduced);
      if (k >= 1) this.finishBlend(ctx);
    } else if (this.cued >= 0) this.route(g, this.playing, this.cued, 0, false);
    const p = this.trackPos[this.playing], r = 15 + bands.low * 9;
    g.beginPath(); g.arc(p.x, p.y, r, 0, TAU);
    g.strokeStyle = 'rgba(33,246,188,' + (0.45 + bands.low * 0.4) + ')'; g.lineWidth = 2; g.stroke();
    if (this.cued >= 0) { const q = this.trackPos[this.cued]; g.beginPath(); g.arc(q.x, q.y, 13, 0, TAU); g.strokeStyle = 'rgba(134,203,254,.5)'; g.lineWidth = 1.5; g.stroke(); }
  },
  /* the path from one cluster to another, drawn round the wheel rather than across it: interpolate the angle
     the short way and the radius straight, so a blend between the two rings spirals the way the wheel reads.
     k = how much of it the blend has travelled; the rest stays as a dotted ice route. */
  route(g, i, j, k, head) {
    const cx = this.cx, cy = this.cy, A = this.trackPos[i], B = this.trackPos[j];
    const a0 = Math.atan2(A.y - cy, A.x - cx), r0 = Math.hypot(A.x - cx, A.y - cy);
    const r1 = Math.hypot(B.x - cx, B.y - cy);
    let d = Math.atan2(B.y - cy, B.x - cx) - a0;
    while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
    const at = (u) => { const a = a0 + d * u, r = r0 + (r1 - r0) * u; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    const N = 36;
    g.beginPath();
    for (let s = 0; s <= N; s++) { const p = at(s / N); if (s) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
    g.setLineDash([3, 5]); g.strokeStyle = 'rgba(134,203,254,.32)'; g.lineWidth = 1.25; g.stroke(); g.setLineDash([]);
    if (k <= 0) return;
    g.beginPath();
    for (let s = 0; s <= N; s++) { const p = at((s / N) * k); if (s) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
    /* twice, wide and faint under narrow and bright: a 2px line on a field of lit dots disappears */
    g.strokeStyle = 'rgba(33,246,188,.16)'; g.lineWidth = 7; g.lineCap = 'round'; g.stroke();
    g.strokeStyle = 'rgba(33,246,188,.9)'; g.lineWidth = 2.5; g.stroke(); g.lineCap = 'butt';
    if (!head) return;
    const p = at(k);
    g.beginPath(); g.arc(p[0], p[1], 10, 0, TAU); g.fillStyle = 'rgba(33,246,188,.2)'; g.fill();
    g.beginPath(); g.arc(p[0], p[1], 5, 0, TAU); g.fillStyle = 'rgba(33,246,188,.95)'; g.fill();
  },
  /* ---- atlas (§1.4, §3) ------------------------------------------------------------ */
  /* the camera and the glyph pass follow the beat: the wall (1-2) is categorical on the wall's own lattice with the
     camera held at identity; the wheel (3) is one mint ramp under a pan camera */
  atlasBeat(ctx) {
    const P = ctx.particles, W = P.w, prov = P.prov, n = P.n;
    P.glyphAll(true);
    /* glyph brightness is normalised per hue, so "dimmed on the way out" has to be carried by weight: the 81% fall as a
       lighter rain in beat two, and once the wheel is up they weigh nothing (parked, never drawn crossing the screen) */
    const out = this.beat === 1 ? 255 : this.beat === 2 ? 90 : 0;
    for (let i = 0; i < n; i++) W[i] = prov[i] === 0 ? 255 : out;
    if (this.beat === 1 || this.beat === 2) {
      if (this.camMode !== 'none') { ctx.view.configure({ mode: 'none' }); this.camMode = 'none'; }
      P.catBy((i) => P.prov[i] + 1); /* 1 tapped, 2 shuffled, 3 served: the renderer's default family map */
      P.glyphMode('cat', { cats: [{ family: 'neutral' }, { family: 'tap' }, { family: 'shuffle' }, { family: 'served' }] });
      /* cell edges sit on the lines between dots (first dot centre minus half a pitch), so no dot straddles two cells */
      const c = this.wcell; P.glyphGrid({ ox: this.wox - c / 2, oy: this.woy - c / 2, pw: c, ph: c, fit: 'multiple' });
      ctx.labels.set('make', []);
    } else {
      const re = ctx.atlas && ctx.atlas.reenter;
      if (this.camMode !== 'pan' || re) { ctx.view.configure({ mode: 'pan', zMin: 1, zMax: 2.2, drift: false, look: (k) => this.look(k) }); this.camMode = 'pan'; }
      P.glyphGrid(null); P.glyphMode('cont', { colour: 'mean' });
      this.atlasLabels(ctx);
    }
  },
  keyPos(num, letter) {
    const a = rad(ang(num)), r = letter === 'A' ? this.rIn - this.jit - 11 : this.rOut + this.jit + 9;
    return [this.cx + Math.cos(a) * r, this.cy + Math.sin(a) * r];
  },
  /* a key's label is centred on the spot today's key text is centred on (D3: key names do not move), so it stays
     outside the outer ring (B) or inside the inner one (A). the item asks the layer for a centred box (`align: 'c'`,
     round 2b: a corner box let the layer's eight-position search move a key 28-47 px when its first corner was taken);
     the anchor carries a small screen-space correction per key: two frames after the layer has placed the labels (and
     whenever the camera settles), the text's real centre is read back and the correction takes up the rounding. a key
     the layer cannot centre there is not placed at all, and today's key text shows in its own place (mk-bare) */
  keyCorr(key) {
    const c = this.kcorr || (this.kcorr = {});
    if (!c[key]) c[key] = [0, 0];
    return c[key];
  },
  keyAnchor(num, letter, z) {
    const [x, y] = this.keyPos(num, letter), c = this.keyCorr(num + letter), k = 1 / (z || 1);
    return [x + c[0] * k, y + c[1] * k];
  },
  keyMove(ctx, z) {
    this.labelEls.forEach(({ num, letter }) => { const key = num + letter; if (!this.keysWith.has(key)) return; const [x, y] = this.keyAnchor(num, letter, z); ctx.labels.update('make', 'k' + key, { x, y }); });
  },
  /* zoom changes the world size of that screen offset: re-anchor the key labels (pans need nothing); once the camera
     has been still for a moment, read the placed labels back */
  keyZoom(ctx) {
    if (this.beat !== 3) return;
    const z = +ctx.view.z || 1; if (z !== this.kz) { this.kz = z; this.keyMove(ctx, z); }
    clearTimeout(this.kfixT); this.kfixT = setTimeout(() => { this.kfixN = 0; this.keyFix(ctx); }, 200);
  },
  /* the layer places on its own frame and fades a label in a frame later, so look twice: soon, and once it has settled */
  keyFixSoon(ctx) { requestAnimationFrame(() => requestAnimationFrame(() => this.keyFix(ctx))); clearTimeout(this.kfixT2); this.kfixT2 = setTimeout(() => this.keyFix(ctx), 450); },
  keyFix(ctx) {
    if (!this.active || !this.atl || this.beat !== 3) return;
    const layer = document.getElementById('atlas-labels'); if (!layer) return;
    const z = +ctx.view.z || 1, shown = new Set(); let moved = false;
    layer.querySelectorAll('.lab.on').forEach((el) => {
      const key = el.textContent; if (!/^\d{1,2}[AB]$/.test(key) || !this.keysWith.has(key)) return;
      shown.add(key);
      const tn = el.firstChild; if (!tn || tn.nodeType !== 3) return;
      const rg = document.createRange(); rg.selectNodeContents(tn); const b = rg.getBoundingClientRect(); if (!b.width) return;
      /* the target is today's text box for the same key (the hidden span, still laid out in place under the camera): the
         label's text takes its centre; at the home pose the two are the same size, so the corners match too */
      const span = this.keySpan && this.keySpan[key]; let dx, dy;
      if (span && span.firstChild) {
        const r2 = document.createRange(); r2.selectNodeContents(span.firstChild); const t = r2.getBoundingClientRect();
        dx = t.left + t.width / 2 - (b.left + b.width / 2); dy = t.top + t.height / 2 - (b.top + b.height / 2);
      } else { const [wx, wy] = this.keyPos(parseInt(key, 10), key.slice(-1)), [sx, sy] = ctx.view.apply(wx, wy); dx = sx - (b.left + b.width / 2); dy = sy - (b.top + b.height / 2); }
      /* the layer rounds a box to whole px: under 0.35 px is as close as it gets (the pass stops after four rounds) */
      if (Math.abs(dx) > 0.35 || Math.abs(dy) > 0.35) { const c = this.keyCorr(key); c[0] += dx; c[1] += dy; moved = true; }
    });
    this.keyBare(layer, shown);
    if (moved) { this.keyMove(ctx, z); if (++this.kfixN < 4) this.keyFixSoon(ctx); }
  },
  /* a key whose pill the layer is not showing shows today's key text in its place (mk-bare) */
  keyBare(layer, shown) {
    if (!this.active || !this.atl || this.beat !== 3 || !this.labelEls) return;
    layer = layer || document.getElementById('atlas-labels'); if (!layer) return;
    if (!shown) { shown = new Set(); layer.querySelectorAll('.lab.on').forEach((el) => { const k = el.textContent; if (/^\d{1,2}[AB]$/.test(k) && this.keysWith.has(k)) shown.add(k); }); }
    const off = layer.style.display === 'none' || getComputedStyle(layer).display === 'none'; /* labels switched off: every key keeps its plain name */
    if (off || shown.size) this.labelEls.forEach(({ el, num, letter }) => { const key = num + letter; if (this.keysWith.has(key)) el.classList.toggle('mk-bare', off || !shown.has(key)); });
  },
  /* the wheel's names: every key that holds a track, the 22 titles (revealed as the camera closes in) and the two decks */
  atlasLabels(ctx) {
    if (this.beat !== 3 || !this.ready || !this.trackPos.length) { ctx.labels.set('make', []); return; }
    const items = [], z = +ctx.view.z || 1; this.kz = z;
    if (!this.offZoom) this.offZoom = ctx.view.onChange(() => this.keyZoom(ctx));
    /* a small wheel (phones) has no room for key names at rest: there they appear once the camera has closed in */
    this.labelEls.forEach(({ num, letter }) => {
      const key = num + letter; if (!this.keysWith.has(key)) return;
      const [x, y] = this.keyAnchor(num, letter, z), gated = !this.showLabels || (letter === 'A' && !this.showInner);
      /* the unbracketed (region) style: a bracketed box is ~50 px wide and at three and nine o'clock it would lie over the
         cluster beside it and take the tap meant for it; this one is about as wide as today's key text */
      items.push({ id: 'k' + key, text: key, x, y, r: 0.001, pri: 2, kind: 'region', align: 'c', zoom: gated ? [1.6, 99] : null, go: (c) => this.keyFocus(num, letter, c, true) });
    });
    this.kfixN = 0; this.keyFixSoon(ctx);
    const r = (this.bs || 28) / 2;
    this.tracks.forEach((t, i) => {
      const p = this.trackPos[i];
      items.push({ id: 't' + i, text: t.t, x: p.x, y: p.y, r, pri: i === this.playing ? 6 : 4, kind: 'obj', zoom: [1.35, 99], go: (c) => this.labelTrack(i, c) });
    });
    /* the decks' names: only where the wheel has room between its rings for them (a desktop pointer). on a touch screen or
       under the chip strip the wheel is small and the name lay over the inner ring's glyphs; the a / b badges on the
       clusters and the desk line already say which deck is which */
    const show = (this.armed || !!this.blend) && !ctx.coarse && !this.chips;
    [[this.playing, 'deck a'], [show && this.cued >= 0 && this.cued !== this.playing ? this.cued : -1, 'deck b']].forEach(([k, text]) => {
      if (k < 0 || !show) return; const p = this.trackPos[k];
      /* no go: a region label lets a press through to the cluster under it, which is the thing to tap */
      items.push({ id: text, text, x: p.x, y: p.y + r * 0.2, r: r + 4, pri: 8, kind: 'region' });
    });
    ctx.labels.set('make', items);
  },
  labelTrack(i, ctx) {
    const p = this.trackPos[i]; if (!p) return;
    ctx.view.flyTo({ wx: p.x, wy: p.y, z: Math.max(1.8, ctx.view.z || 1) }, { speed: 'quick', lock: this.tracks[i].t });
    ctx.lock(this.tracks[i].t);
    if (this.armed) { this.stopDemo(); this.tap(i, ctx, false); }
  },
  /* a key: the camelot rule for it in the hud, and the tracks in keys that mix cleanly with it lit */
  keyFocus(num, letter, ctx, fly) {
    const keys = mixKeys(num, letter), set = new Set(), me = num + letter;
    this.tracks.forEach((t, i) => { if (i !== this.playing && (t.k === me || keys.includes(t.k))) set.add(i); });
    this.kf = { num, letter, keys, set };
    this.paint(ctx);
    ctx.hud(me + ' \u00b7 keys that mix cleanly with it: ' + keys.join(', '));
    if (fly) { const [x, y] = this.keyPos(num, letter); ctx.view.flyTo({ wx: x, wy: y, z: Math.max(1.6, ctx.view.z || 1) }, { speed: 'quick', lock: me }); ctx.lock(me); }
  },
  /* exact axis marks on the overlay: one short tick per key on each ring, and, with a key in focus, arcs on it and on
     the three keys that mix cleanly with it (drawn in world px; the shell applies the camera) */
  drawKeys(g) {
    if (this.beat !== 3) return;
    const cx = this.cx, cy = this.cy, jit = this.jit;
    g.strokeStyle = 'rgba(134,203,254,.34)'; g.lineWidth = 1; g.beginPath();
    for (let n = 1; n <= 12; n++) {
      const a = rad(ang(n)), c = Math.cos(a), sn = Math.sin(a);
      const r0 = this.rOut + jit + 1, r1 = r0 + 4; g.moveTo(cx + c * r0, cy + sn * r0); g.lineTo(cx + c * r1, cy + sn * r1);
      if (this.showInner) { const q0 = this.rIn - jit - 1, q1 = q0 - 4; g.moveTo(cx + c * q0, cy + sn * q0); g.lineTo(cx + c * q1, cy + sn * q1); }
    }
    g.stroke();
    const kf = this.kf; if (!kf) return;
    const arc = (num, letter, w, col) => {
      const a = rad(ang(num)), r = letter === 'A' ? this.rIn : this.rOut;
      g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, r, a - 0.2, a + 0.2); g.stroke();
    };
    kf.keys.forEach((k) => arc(parseInt(k, 10), k.slice(-1), 2, 'rgba(134,203,254,.55)'));
    arc(kf.num, kf.letter, 3, 'rgba(134,203,254,.95)');
  },
  look(k) {
    if (k === 'wheel' || k === 'centre') return [this.cx, this.cy];
    const t = /^track:(.+)$/.exec(String(k)); if (t) { const i = this.tracks.findIndex((x) => x.f === t[1]); return i >= 0 ? [this.trackPos[i].x, this.trackPos[i].y] : null; }
    const m = /^key:(\d{1,2})([AB])$/.exec(String(k)); if (m) return this.keyPos(+m[1], m[2]);
    return null;
  },
  /* the tap layer's own pick, in world coordinates: the nearest cluster centre, never the hole or past the rims */
  hitTap(wx, wy, ctx) {
    if (!this.armed) return;
    let best = -1, bd = Infinity;
    this.trackPos.forEach((p, i) => { const d = (p.x - wx) * (p.x - wx) + (p.y - wy) * (p.y - wy); if (d < bd) { bd = d; best = i; } });
    const lim = this.bs * 0.9 + this.jit;
    if (best < 0 || bd > lim * lim) return;
    this.stopDemo(); this.tap(best, ctx, false);
  },
  /* the wheel is up: skip what is left of the finale (a search or a tour that wants a track now) */
  toWheel(ctx) {
    if (!this.ready) return false;
    if (this.beat !== 3) { this.ran = true; this.beatThree(ctx, performance.now(), true); this.settled(); }
    return true;
  },
  setAngle(k, ctx) {
    const a = this.angles[k]; if (!a || !this.ready || !atlasOn(ctx)) return 0;
    this.stopDemo();
    if (a.id === 'wheel') {
      if (this.beat === 1 || this.beat === 2) return Math.max(0, Math.round((this.t0 < 0 ? B2 : this.t0 + B2 - performance.now()) + SETTLE));
      this.toWheel(ctx); ctx.view.home({}); return 0;
    }
    if (a.id === 'fall') {
      if (this.blend) this.finishBlend(ctx);
      ctx.view.home({ instant: true });
      if (ctx.reduced) { this.toWheel(ctx); return 0; }
      this.ran = true; this.beatOne(ctx); return B2 + SETTLE;
    }
    /* blend: put a neighbour on deck b and let the engine run the blend, the dotted route first */
    this.toWheel(ctx); if (this.blend) this.finishBlend(ctx);
    const T = this.tracks, a0 = this.playing; let b = -1;
    for (let j = 0; j < T.length; j++) if (j !== a0 && T[j].k !== T[a0].k && adjKey(T[a0], T[j])) { b = j; break; }
    if (b < 0) b = this.farFrom(a0);
    this.aLive = true; this.cued = b; this.paint(ctx); this.refreshDesk();
    const rel = this.relation(a0, b);
    this.demoT = setTimeout(() => { this.demoT = 0; if (this.active && this.cued === b) this.doBlend(ctx); }, 900);
    return 900 + Math.round(rel.xf * 2200);
  },
  /* search: {track: <file id or title>} puts that track on deck a and plays it; a field tap ({track, tap}) loads it
     the way a tap on its circle would. {key: '8B'} opens that key's mixing rule */
  focus(desc, ctx) {
    if (!desc || !this.ready || !this.tracks.length) return false;
    if (desc.key) { const m = /^(\d{1,2})([AB])$/.exec(String(desc.key)); if (!m || !this.toWheel(ctx)) return false; this.keyFocus(+m[1], m[2], ctx, true); return true; }
    if (desc.track == null) return false;
    const f = String(desc.track), i = this.tracks.findIndex((t) => t.f === f || t.t.toLowerCase() === f.toLowerCase());
    if (i < 0 || !this.toWheel(ctx)) return false;
    this.stopDemo();
    if (desc.tap) { if (this.armed) this.tap(i, ctx, false); return true; }
    if (this.blend) this.finishBlend(ctx);
    this.kf = null; this.cued = -1; this.aLive = true; this.select(i, ctx, true); this.refreshDesk();
    const p = this.trackPos[i]; ctx.view.flyTo({ wx: p.x, wy: p.y, z: 1.8 }, { speed: 'quick', lock: this.tracks[i].t }); ctx.lock(this.tracks[i].t);
    return true;
  },
  pick(wx, wy) {
    if (!this.ready || this.beat !== 3) return null;
    let best = -1, bd = Infinity;
    this.trackPos.forEach((p, i) => { const d = Math.hypot(p.x - wx, p.y - wy); if (d < bd) { bd = d; best = i; } });
    if (best < 0 || bd > (this.bs || 28) * 0.9 + this.jit) return null;
    const p = this.trackPos[best];
    return { label: this.tracks[best].t, wx: p.x, wy: p.y, z: 1.8, focus: { track: this.tracks[best].f, tap: true } };
  },
  gestures() { return { drag: 'camera' }; },
  keepout() {
    const el = this.textEl; if (!el) return [];
    const r = el.getBoundingClientRect(); return r.width && r.height ? [{ x: r.left, y: r.top, w: r.width, h: r.height }] : [];
  },
  precision() { return []; },
  /* ---- kiosk ------------------------------------------------------------------- */
  /* three tracks that are harmonic neighbours of each other, so the glow walks one step round the wheel */
  chain() {
    const T = this.tracks, n = T.length;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      if (b === a || sameKey(T[a], T[b]) || !adjKey(T[a], T[b])) continue;
      for (let c = 0; c < n; c++) { if (c === a || c === b || sameKey(T[b], T[c]) || !adjKey(T[b], T[c])) continue; return [a, b, c]; }
    }
    return [0, 1 % n, 2 % n];
  },
  /* the track furthest round the wheel from this one, so the demo's blend is the long dissolve rather than
     a pair that happens to share a key and passes in half a second */
  farFrom(i) {
    const T = this.tracks; let best = i === 0 ? 1 % T.length : 0, bd = -1;
    for (let j = 0; j < T.length; j++) {
      if (j === i) continue;
      const d = Math.min((T[i].num - T[j].num + 12) % 12, (T[j].num - T[i].num + 12) % 12);
      if (d > bd) { bd = d; best = j; }
    }
    return best;
  },
  stopDemo() { clearTimeout(this.demoT); this.demoT = 0; },
  demo(ctx) {
    if (!this.ready) return;
    this.stopDemo();
    const seq = this.chain(), live = () => this.root && this.root.parentElement && this.root.parentElement.classList.contains('is-active');
    /* three tracks one step apart, then one blend back to the first: the long way round, which is the
       case worth hearing. it never touches focus, so a visitor arriving mid-demo is not yanked anywhere. */
    const step = (k) => {
      if (!live()) return;
      if (k < seq.length) { this.aLive = true; this.cued = -1; this.select(seq[k], ctx, true); this.refreshDesk(); this.demoT = setTimeout(() => step(k + 1), 9000); return; }
      if (k === seq.length) { this.cued = this.farFrom(this.playing); this.paint(ctx); this.refreshDesk(); this.demoT = setTimeout(() => step(k + 1), 2800); return; }
      this.doBlend(ctx);
    };
    const wait = this.beat > 0 && this.beat < 3 ? Math.max(0, this.t0 + B2 + SETTLE - performance.now()) : 0;
    this.demoT = setTimeout(() => { if (live()) step(0); }, wait + 200);
  },
};
