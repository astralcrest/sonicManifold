(() => {
  const CLIP = 8000, FALLBACK = 2500, ROUNDS = 12;
  const $ = id => document.getElementById(id);
  const body = document.body;
  const PK = window.WK && window.WK.P;
  const FAMC = (window.WK && window.WK.FAMC) || {};
  const NIGHT = "#06010f", INK = "#efe9ff", MINT = "#21f6bc", AMBER = "#f5a623";
  const CAP0 = "color = genre family. each song you hear lands here and pulses with its clip.";
  let D = null, LD = null, S = null, R = 0, heard = [false, false], shown = [], cur = null;
  let tourTok = 0, tourOn = false, tourK = -1, mapTok = 0, hl = null, wait = null;
  let pvBase = null, pvKey = "", mapBase = null, mapKey = "", MP = [], SHARED = false;
  const tourLab = () => SHARED ? "hear the picks in order" : "hear your picks in order";
  const audio = new Audio();
  audio.preload = "none";
  let clip = null;

  const snd = () => !window.WK || !WK.sound || WK.sound();
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const half = () => shuffle([0, 0, 0, 1, 1, 1]);
  const famOf = i => (LD ? LD.fam[LD.f[i]] : "") || "";
  const col = (i, fam) => FAMC[fam || famOf(i)] || "#9a90b8";
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function redraw() { if (body.classList.contains("done")) mapFrame(); else pvFrame(); }
  function liveOn() { if (window.WK) WK.live(redraw); }
  function liveOff() { if (window.WK) WK.still(); }

  function stopClip() {
    if (!clip) return;
    clearTimeout(clip.fb); clearTimeout(clip.end); cancelAnimationFrame(clip.raf);
    audio.onplaying = audio.onerror = null;
    try { audio.pause(); } catch (e) {}
    const c = clip; clip = null;
    if (c.btn) c.btn.classList.remove("playing");
    c.meter.style.width = "0";
    cur = null; liveOff();
    c.done && c.done(c.ok);
    redraw();
  }

  function playClip(url, meter, btn, done, fail) {
    stopClip();
    const c = clip = { meter, btn, done, fail, t0: 0, ok: false };
    if (btn) btn.classList.add("playing");
    const go = () => {
      if (clip !== c || c.t0) return;
      clearTimeout(c.fb);
      c.t0 = performance.now();
      const tick = () => {
        if (clip !== c) return;
        meter.style.width = Math.min(100, (performance.now() - c.t0) / CLIP * 100) + "%";
        c.raf = requestAnimationFrame(tick);
      };
      tick();
      c.end = setTimeout(() => { if (clip === c) stopClip(); }, CLIP);
    };
    audio.onplaying = () => { c.ok = true; go(); };
    audio.onerror = go;
    c.fb = setTimeout(go, FALLBACK);
    audio.src = url;
    // the browser held the sound until a press: never run the meter in silence
    const held = e => { if (!e || e.name !== "NotAllowedError") return go(); if (clip !== c) return; c.done = c.fail; stopClip(); };
    try { const p = audio.play(); if (p && p.catch) p.catch(held); } catch (e) { go(); }
  }

  function newSession() {
    const order = shuffle(D.pairs.map((_, i) => i)).slice(0, ROUNDS);
    const primed = shuffle([1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]);
    const tgt = [half(), half()], pos = [half(), half()];
    const n = [0, 0];
    S = order.map((pi, r) => {
      const c = primed[r], k = n[c]++;
      return { pi, primed: !!c, target: tgt[c][k], targetOnA: !pos[c][k], pick: null };
    });
    R = 0;
  }

  const sideOpt = (s, side) => (side === 0) === s.targetOnA ? s.target : 1 - s.target;

  function clearWait() { if (wait) { clearInterval(wait); wait = null; } }

  function endPrimer(s, ok) {
    clearWait();
    if (S[R] !== s) return;
    if (!ok && s.primed) { s.primed = false; s.skipped = true; }
    $("primer").classList.remove("on");
    $("skip").disabled = true;
    ready();
  }

  function startPrimer(s, p) {
    const pr = p.pr[s.target];
    const held = () => {
      if (S[R] !== s) return;
      shown = shown.filter(x => x.tag !== "first");
      $("pvcap").textContent = CAP0;
      $("status").innerHTML = '<span class="a">the first song is ready.</span> press hear the first song, or skip it.';
      $("hear1").hidden = false;
    };
    const run = () => {
      clearWait();
      $("hear1").hidden = true;
      $("status").innerHTML = '<span class="a">a first song plays.</span> just listen. you do not pick this one.';
      shown.push({ i: pr.i, tag: "first", fam: pr.f });
      playClip(pr.u, $("pm"), null, ok => endPrimer(s, ok), held);
      cur = { i: pr.i, fam: pr.f }; liveOn();
      $("pvcap").textContent = "playing the first song: " + (pr.f || "");
    };
    $("hear1").onclick = run;
    if (snd()) { run(); return; }
    $("status").innerHTML = '<span class="a">sound is off.</span> tap the sound chip at the top to hear the first song, or skip it.';
    wait = setInterval(() => { if (S[R] !== s) { clearWait(); return; } if (snd()) run(); }, 400);
  }

  function showRound() {
    const s = S[R], p = D.pairs[s.pi];
    clearWait(); stopClip();
    body.className = "r";
    if (!/kiosk=1/.test(location.search)) try { history.replaceState(null, "", location.pathname + location.search + "#n=" + (R + 1)); } catch (e) {}
    $("rk").textContent = `round ${R + 1} of ${ROUNDS}`;
    $("tk").textContent = R + 1; $("tkl").textContent = `of ${ROUNDS} rounds: play both, then pick`;
    heard = [false, false]; shown = []; cur = null;
    if (window.WK && WK.primary) WK.primary(null);
    ["A", "B"].forEach((L) => {
      $("c" + L).classList.remove("won");
      $("n" + L).textContent = "the name shows after you pick";
      $("pick" + L).disabled = true;
      $("play" + L).disabled = s.primed;
      $("m" + L).style.width = "0";
    });
    $("next").disabled = true;
    $("next").textContent = R === ROUNDS - 1 ? "see the result" : "next round";
    $("pvcap").textContent = CAP0;
    $("hear1").hidden = true;
    pvFrame();
    if (s.primed) {
      $("primer").classList.add("on");
      $("skip").disabled = false;
      $("pm").style.width = "0";
      startPrimer(s, p);
    } else {
      $("primer").classList.remove("on");
      ready();
    }
  }

  function ready() {
    $("status").textContent = S[R].primed
      ? "now play a, then b, and pick the one you like more. did the first song pull you?"
      : S[R].skipped ? "skipped, so this round counts as one with no first song. play a, then b, and pick the one you like more."
      : "no first song this round. play a, then b, and pick the one you like more.";
    $("playA").disabled = $("playB").disabled = false;
    if (!snd()) $("status").textContent += " sound is off: tap the sound chip at the top first.";
  }

  function play(side) {
    const s = S[R], p = D.pairs[s.pi];
    const L = side ? "B" : "A";
    if (clip && clip.btn === $("play" + L)) { stopClip(); return; }
    if (!snd()) { $("status").textContent = "sound is off: tap the sound chip at the top, then play " + L.toLowerCase() + " again. you pick only after you hear both."; return; }
    const o = p.o[sideOpt(s, side)];
    playClip(o.u, $("m" + L), $("play" + L), null);
    heard[side] = true;
    if (!shown.some(x => x.tag === L.toLowerCase())) shown.push({ i: o.i, tag: L.toLowerCase(), fam: o.f });
    cur = { i: o.i, fam: o.f }; liveOn();
    $("pvcap").textContent = "playing " + L.toLowerCase() + ": " + (o.f || "") + (heard[0] && heard[1] ? ". now pick." : ". " + (heard[0] ? "b" : "a") + " is still to hear.");
    if (heard[0] && heard[1] && s.pick === null) { $("pickA").disabled = $("pickB").disabled = false; }
  }

  function pick(side) {
    const s = S[R], p = D.pairs[s.pi];
    if (s.pick !== null) return;
    stopClip(); clearWait();
    s.pick = sideOpt(s, side);
    $("pickA").disabled = $("pickB").disabled = true;
    $(side ? "cB" : "cA").classList.add("won");
    ["A", "B"].forEach((L, sd) => {
      const o = p.o[sideOpt(s, sd)];
      const nm = $("n" + L); nm.textContent = "";
      const b = document.createElement("b"); b.textContent = o.n; nm.append(b, o.t);
    });
    const end = R === ROUNDS - 1 ? " that was the last one." : "";
    if (s.primed) {
      $("status").innerHTML = "";
      const a = document.createElement("span"); a.className = "a";
      a.textContent = `the first song sat near ${p.o[s.target].n}.`;
      $("status").append(a, (s.pick === s.target ? " you went with it." : " you went against it.") + end);
    } else $("status").textContent = (R === ROUNDS - 1 ? "picked." : "picked. next round when you are ready.") + end;
    $("next").disabled = false;
    if (window.WK && WK.primary) WK.primary($("next"));
    $("pvcap").textContent = "your pick is saved. the next round starts when you press next round.";
    pvFrame();
  }

  function doneLine() { $("now").textContent = snd() ? `press ${tourLab()}, tap a shape on the map, or tap a row.` : "sound is off: tap the sound chip at the top, then tap a shape or a row."; }

  function showResult() {
    stopClip(); clearWait(); tourEnd("");
    if (window.WK && WK.primary) WK.primary(null);
    body.className = "done" + (SHARED ? " shared" : "");
    let k = 0, m = 0;
    S.forEach(s => { if (s.pick === s.target) s.primed ? k++ : m++; });
    const nP = S.filter(s => s.primed).length, nM = S.length - nP, sk = S.filter(s => s.skipped).length, who = SHARED ? "they" : "you";
    $("rhead").textContent = SHARED ? "someone's twelve rounds, shared with you" : "your twelve rounds";
    $("mhead").textContent = SHARED ? "their picks on my sound map" : "your picks on my sound map";
    $("tour").textContent = tourLab();
    const none = `with none, ${who} picked a random side ${m} of ${nM}.`;
    $("sent").textContent = nP ? `after a first song, ${who} picked its side ${k} of ${nP} times. ${none}` + (sk ? ` (${who} skipped the first song ${sk === 1 ? "once" : sk + " times"}; those rounds count as none.)` : "") : `${who} skipped every first song, so there is nothing to compare. ${none}`;
    $("bk").textContent = `${k} of ${nP}`; $("bm").textContent = `${m} of ${nM}`;
    $("tk").textContent = `${k} of ${nP}`; $("tkl").textContent = "after a first song, picks on its side";
    $("ik").style.width = (nP ? k / nP * 100 : 0) + "%"; $("im").style.width = (nM ? m / nM * 100 : 0) + "%";
    const ch = document.querySelector(".chance"); if (ch) ch.textContent = nP ? `dashed line: ${nP / 2} of ${nP}, what a coin would give on average` : "no first song was heard this time";
    const log = $("log"); log.textContent = "";
    S.forEach((s, r) => {
      const p = D.pairs[s.pi], li = document.createElement("li");
      li.tabIndex = 0; li.setAttribute("role", "button"); li.dataset.r = r;
      li.setAttribute("aria-label", `hear pick ${r + 1}`);
      const b = document.createElement("b"); b.textContent = p.o[s.pick].n;
      li.append(`${String(r + 1).padStart(2, "0")} · `, b, ` over ${p.o[1 - s.pick].n}`);
      if (s.primed) { const e = document.createElement("em"); e.textContent = ` · first: ${p.pr[s.target].n} · near ${p.o[s.target].n}` + (s.pick === s.target ? " · went with it" : " · went against it"); li.append(e); }
      else if (s.skipped) { const e = document.createElement("em"); e.textContent = " · first song skipped, counted as none"; li.append(e); }
      log.append(li);
    });
    doneLine();
    $("next").disabled = false; $("next").textContent = SHARED ? "play your own" : "again";
    mapBase = null; mapFrame();
    try { history.replaceState(null, "", "#r=" + encodeS()); } catch (e) {}
    window.scrollTo(0, 0);
  }

  const encodeS = () => S.map(s => (((s.pi << 3) | (s.primed ? 4 : 0) | (s.target << 1) | s.pick) & 255).toString(16).padStart(2, "0")).join("")
    + S.reduce((a, s, r) => a | (s.skipped ? 1 << r : 0), 0).toString(16).padStart(3, "0");
  function decodeS(h, sk) {
    if (!/^[0-9a-f]{24}$/.test(h)) return null;
    const out = [], skm = sk ? parseInt(sk, 16) : 0;
    for (let i = 0; i < 24; i += 2) {
      const b = parseInt(h.substr(i, 2), 16), pi = b >> 3;
      if (pi >= D.pairs.length) return null;
      out.push({ pi, primed: !!(b & 4), target: (b >> 1) & 1, targetOnA: true, pick: b & 1, skipped: !(b & 4) && !!((skm >> (i / 2)) & 1) });
    }
    return out;
  }
  const dist = (a, b) => Math.hypot(D.xy[a][0] - D.xy[b][0], D.xy[a][1] - D.xy[b][1]) / 1414.2 * 100;
  function slipFields() {
    let k = 0, m = 0, span = 0;
    S.forEach(s => { if (s.pick === s.target) s.primed ? k++ : m++; const p = D.pairs[s.pi]; span += dist(p.o[s.pick].i, p.o[1 - s.pick].i); });
    const pts = S.map(s => D.xy[D.pairs[s.pi].o[s.pick].i]);
    const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cy = pts.reduce((a, q) => a + q[1], 0) / pts.length;
    const spread = pts.reduce((a, q) => a + Math.hypot(q[0] - cx, q[1] - cy), 0) / pts.length / 1414.2 * 100;
    return {
      wall: "taste", title: "the taste test", sub: "twelve rounds, a toy",
      lines: [["after a first song, on its side", k + " of " + S.filter(s => s.primed).length], ["with none, on a random side", m + " of " + S.filter(s => !s.primed).length], ["picked vs passed: how far apart", Math.round(span / S.length) + "% of map"], ["how scattered your picks are", Math.round(spread) + "% of map"]],
      next: "your picks are lit on the sound map at the link below. a toy.",
      url: "https://astralcrest.github.io/sonicManifold/editions/taste/#r=" + encodeS(),
      foot: "a toy, not a finding"
    };
  }
  $("slip").onclick = () => { if (S && window.smReceipt) window.smReceipt(slipFields()); };

  function reset() {
    stopClip(); clearWait(); tourEnd(""); S = null; R = 0; SHARED = false;
    if (window.smReceipt && window.smReceipt.close) window.smReceipt.close(true);
    body.className = "";
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    $("next").textContent = "start"; $("next").disabled = !D;
    drawPreview(); window.scrollTo(0, 0);
    if (D) { newSession(); showRound(); }
  }

  /* ---------- the map under the round: only songs you have heard this round ---------- */
  function sized(cv) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.round(cv.getBoundingClientRect().width) || 0;
    return { dpr, w };
  }
  function fieldOn(g, X, Y, w, dim) {
    const small = w < 420;
    if (PK) PK.field(g, D.xy, X, Y, { pl: LD ? LD.pl : null, lo: small ? 1.6 : 2.2, hi: small ? 4.5 : 7, core: dim, col: i => LD ? col(i) : "#7a66c8" });
    else { g.fillStyle = "#7a66c8"; for (let i = 0; i < D.xy.length; i++) g.fillRect(X(i) - 1, Y(i) - 1, 2, 2); }
  }
  function layout(w) { const pad = 14, sc = (w - 2 * pad) / 1000; return { X: i => pad + D.xy[i][0] * sc, Y: i => pad + D.xy[i][1] * sc }; }

  function drawPreview() { pvBase = null; pvFrame(); }
  function pvFrame() {
    const cv = $("pv"); if (!D) return;
    const z = sized(cv); if (!z.w) return;
    const key = z.w + ":" + z.dpr;
    const L = layout(z.w);
    if (!pvBase || pvKey !== key) {
      pvKey = key;
      pvBase = document.createElement("canvas"); pvBase.width = pvBase.height = Math.round(z.w * z.dpr);
      const b = pvBase.getContext("2d"); b.setTransform(z.dpr, 0, 0, z.dpr, 0, 0);
      b.fillStyle = NIGHT; b.fillRect(0, 0, z.w, z.w);
      fieldOn(b, L.X, L.Y, z.w, 0.45);
      cv.width = cv.height = Math.round(z.w * z.dpr);
    }
    const g = cv.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(pvBase, 0, 0);
    g.setTransform(z.dpr, 0, 0, z.dpr, 0, 0);
    const r0 = z.w < 400 ? 7 : 9;
    shown.forEach(h => {
      const x = L.X(h.i), y = L.Y(h.i), c = col(h.i, h.fam);
      if (PK) { PK.peb(g, h.i, x, y, r0, c); } else { g.fillStyle = c; g.beginPath(); g.arc(x, y, r0, 0, 6.2832); g.fill(); }
      g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r0 + 3, 0, 6.2832); g.stroke();
      g.fillStyle = INK; g.font = '600 12px "IBM Plex Mono", monospace'; g.textBaseline = "middle";
      const t = h.tag === "first" ? "first" : h.tag, tw = g.measureText(t).width;
      const lx = x + r0 + 8 + tw > z.w - 2 ? x - r0 - 8 - tw : x + r0 + 8;
      g.fillText(t, lx, y);
    });
    if (cur && window.WK) WK.pulse(g, L.X(cur.i), L.Y(cur.i), col(cur.i, cur.fam), r0 + 6);
    cv.setAttribute("aria-label", "the sound map: " + (shown.length ? shown.length + " song" + (shown.length > 1 ? "s" : "") + " heard this round, each lit in its genre family color" : "your picks land here"));
  }

  /* ---------- the map at the end ---------- */
  function buildItems(L) {
    MP = [];
    S.forEach((s, r) => {
      const p = D.pairs[s.pi], pk = p.o[s.pick], ps = p.o[1 - s.pick];
      MP.push({ i: pk.i, kind: "pick", r, o: pk, x: L.X(pk.i), y: L.Y(pk.i) });
      MP.push({ i: ps.i, kind: "pass", r, o: ps, x: L.X(ps.i), y: L.Y(ps.i) });
      if (s.primed) { const pr = p.pr[s.target]; MP.push({ i: pr.i, kind: "first", r, o: pr, x: L.X(pr.i), y: L.Y(pr.i) }); }
    });
  }
  function mapFrame() {
    if (!S || !D || !body.classList.contains("done")) return;
    const cv = $("map"), z = sized(cv); if (!z.w) return;
    const L = layout(z.w), key = z.w + ":" + z.dpr;
    if (!mapBase || mapKey !== key) {
      mapKey = key;
      mapBase = document.createElement("canvas"); mapBase.width = mapBase.height = Math.round(z.w * z.dpr);
      const b = mapBase.getContext("2d"); b.setTransform(z.dpr, 0, 0, z.dpr, 0, 0);
      b.fillStyle = NIGHT; b.fillRect(0, 0, z.w, z.w);
      fieldOn(b, L.X, L.Y, z.w, 0.4);
      cv.width = cv.height = Math.round(z.w * z.dpr);
      buildItems(L);
    }
    const g = cv.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(mapBase, 0, 0);
    g.setTransform(z.dpr, 0, 0, z.dpr, 0, 0);
    const P = i => [L.X(i), L.Y(i)];
    const ln = (i, j, a, b, wd, al, dash) => { if (PK) PK.ribbon(g, [P(i), P(j)], a, b, wd, al, dash); else { g.strokeStyle = a; g.lineWidth = 1; g.setLineDash(dash || []); g.beginPath(); g.moveTo(L.X(i), L.Y(i)); g.lineTo(L.X(j), L.Y(j)); g.stroke(); g.setLineDash([]); } };
    S.forEach(s => { if (!s.primed) { const p = D.pairs[s.pi]; ln(p.o[s.pick].i, p.o[1 - s.pick].i, "#4a3f72", "#4a3f72", 1, 1); } });
    S.forEach(s => { if (s.primed) { const p = D.pairs[s.pi]; ln(p.o[s.pick].i, p.o[1 - s.pick].i, AMBER, AMBER, 1, 0.8, [3, 4]); } });
    S.forEach(s => { if (s.primed) { const p = D.pairs[s.pi]; ln(p.pr[s.target].i, p.o[s.target].i, AMBER, "#ffd8a0", 2, 1); } });
    const glyph = (i, s, kind, c) => { if (PK) PK.glyph(g, kind, L.X(i), L.Y(i), s * 0.9, c); else { g.fillStyle = c; g.fillRect(L.X(i) - s / 2, L.Y(i) - s / 2, s, s); } };
    S.forEach(s => glyph(D.pairs[s.pi].o[1 - s.pick].i, 9, "dot", "#b9aedc"));
    S.forEach(s => { if (s.primed) glyph(D.pairs[s.pi].pr[s.target].i, 8, "dot", AMBER); });
    const cl = [];
    S.forEach((s, r) => {
      const i = D.pairs[s.pi].o[s.pick].i, on = tourOn && r === tourK, dim = tourOn && r > tourK, x = L.X(i), y = L.Y(i);
      g.globalAlpha = dim ? 0.45 : 1;
      glyph(i, on ? 15 : 11, "star", MINT);
      g.globalAlpha = 1;
      const c = cl.find(q => (q.x - x) ** 2 + (q.y - y) ** 2 < 256);
      if (c) c.rs.push(r); else cl.push({ x, y, rs: [r] });
    });
    g.font = '600 11px "IBM Plex Mono", monospace'; g.textBaseline = "middle"; g.lineJoin = "round";
    const placed = [];
    cl.forEach(c => {
      const t = c.rs.map(r => r + 1).join("\u00b7"), w = g.measureText(t).width;
      const fits = ([lx, ly]) => lx >= 2 && lx + w <= z.w - 2 && ly >= 8 && ly <= z.w - 8;
      const free = ([lx, ly]) => !placed.some(q => lx < q[0] + q[2] + 3 && lx + w + 3 > q[0] && Math.abs(ly - q[1]) < 13);
      const opts = [[c.x + 9, c.y - 10], [c.x + 9, c.y + 10], [c.x - 9 - w, c.y - 10], [c.x - 9 - w, c.y + 10]].filter(fits);
      const at = opts.find(free) || opts[0] || [Math.max(2, Math.min(z.w - 2 - w, c.x + 9)), c.y + 10];
      placed.push([at[0], at[1], w]);
      g.strokeStyle = NIGHT; g.lineWidth = 3; g.strokeText(t, at[0], at[1]);
      g.fillStyle = tourOn && c.rs.includes(tourK) ? INK : tourOn && c.rs.every(r => r > tourK) ? "#6f6790" : "#cfc6e8";
      g.fillText(t, at[0], at[1]);
    });
    if (hl && window.WK) WK.pulse(g, L.X(hl.i), L.Y(hl.i), hl.col, 14);
    cv.setAttribute("aria-label", "the sound map with the twelve picks as mint stars numbered by round, the ones passed as dots, the first songs in amber");
  }

  const tip = $("mtip");
  function nearest(e) {
    const cv = $("map"), r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 18 * 18;
    MP.forEach(m => { const dx = m.x - x, dy = m.y - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = m; } });
    return { m: best, x, y, w: r.width };
  }
  const KIND = { pick: "picked", pass: "passed", first: "the first song" };
  $("map").addEventListener("pointermove", e => {
    const n = nearest(e);
    if (!n.m) { tip.hidden = true; return; }
    const m = n.m;
    tip.textContent = "";
    const b = document.createElement("b"); b.textContent = m.o.n;
    tip.append(b, ` · ${m.o.f || famOf(m.i)} · round ${m.r + 1}, ${KIND[m.kind]} · tap to hear`);
    tip.style.left = Math.max(0, Math.min(n.w - 240, n.x + 12)) + "px"; tip.style.top = Math.max(0, n.y - 38) + "px"; tip.hidden = false;
  });
  $("map").addEventListener("pointerleave", () => { tip.hidden = true; });
  $("map").addEventListener("pointerdown", e => {
    const n = nearest(e); if (!n.m) return;
    const m = n.m;
    if (!snd()) { $("now").textContent = "sound is off: tap the sound chip at the top, then tap a shape again."; return; }
    tourEnd("");
    const t = ++mapTok;
    playClip(m.o.u, $("tm"), null, () => { if (t === mapTok && !tourOn) { hl = null; } });
    hl = { i: m.i, col: col(m.i, m.o.f) }; liveOn();
    $("now").textContent = `${m.o.n}, "${m.o.t}": round ${m.r + 1}, ${KIND[m.kind]}, ${m.o.f || famOf(m.i)}.`;
  });

  /* ---------- hear your picks in order ---------- */
  function tourEnd(msg) {
    tourTok++;
    const was = tourOn;
    tourOn = false; tourK = -1;
    $("tour").textContent = tourLab();
    $("stoptour").hidden = true;
    [].forEach.call($("log").children, li => li.classList.remove("on"));
    if (was) { mapTok++; hl = null; stopClip(); if (msg) $("now").textContent = msg; if (body.classList.contains("done")) mapFrame(); }
  }
  function tourGo(k) {
    const t = ++tourTok;
    if (k >= S.length) { tourEnd("that was all twelve picks."); return; }
    if (!snd()) { $("now").textContent = "sound is off: tap the sound chip at the top, then press hear your picks in order."; return; }
    tourOn = true; tourK = k;
    const s = S[k], o = D.pairs[s.pi].o[s.pick];
    let rep = 0; for (let q = 0; q < k; q++) if (D.pairs[S[q].pi].o[S[q].pick].i === o.i) rep++;
    hl = { i: o.i, col: col(o.i, o.f) };
    $("tour").textContent = k === S.length - 1 ? "finish" : "next pick";
    $("stoptour").hidden = false;
    [].forEach.call($("log").children, li => li.classList.toggle("on", +li.dataset.r === k));
    const row = $("log").children[k]; if (row && row.scrollIntoView && !reduce) row.scrollIntoView({ block: "nearest" });
    const prev = k > 0 ? D.pairs[S[k - 1].pi].o[S[k - 1].pick] : null;
    const fam = o.f || famOf(o.i), pf = prev ? (prev.f || famOf(prev.i)) : null;
    $("now").textContent = `pick ${k + 1} of ${S.length}: ${o.n}, "${o.t}", ${fam}` + (pf && pf !== fam ? `. the family changes from ${pf}.` : pf ? ". same family as the pick before." : ".") + (k < S.length - 1 ? " the next one plays when this ends." : "");
    playClip(o.u, $("tm"), null, () => { if (t === tourTok && tourOn) tourGo(k + 1); });
    hl = { i: o.i, col: col(o.i, o.f) }; liveOn();
    mapFrame();
  }
  $("tour").onclick = () => { if (!S) return; tourGo(tourOn ? tourK + 1 : 0); };
  $("stoptour").onclick = () => tourEnd(`stopped. press ${tourLab()} to start again.`);
  const rowGo = e => { const li = e.target.closest("li"); if (li && li.dataset.r != null) tourGo(+li.dataset.r); };
  $("log").addEventListener("click", rowGo);
  $("log").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); rowGo(e); } });

  $("playA").onclick = () => play(0);
  $("playB").onclick = () => play(1);
  $("pickA").onclick = () => pick(0);
  $("pickB").onclick = () => pick(1);
  $("skip").onclick = () => { const s = S && S[R]; if (!s || !s.primed) return; stopClip(); clearWait(); s.primed = false; s.skipped = true; $("primer").classList.remove("on"); $("skip").disabled = true; ready(); };
  $("next").onclick = () => {
    if (!D) return;
    if (body.classList.contains("done") || !S) { SHARED = false; tourEnd(""); newSession(); showRound(); return; }
    if (S[R].pick === null) return;
    if (R === ROUNDS - 1) { showResult(); return; }
    R++; showRound();
  };
  addEventListener("keydown", e => {
    if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea/i.test((e.target.tagName || ""))) return;
    if (!S || body.classList.contains("done") || !body.classList.contains("r")) return;
    const k = e.key.toLowerCase();
    if (k === "a" && !$("playA").disabled) { e.preventDefault(); $("playA").click(); }
    else if (k === "b" && !$("playB").disabled) { e.preventDefault(); $("playB").click(); }
    else if (k === "1" && !$("pickA").disabled) $("pickA").click();
    else if (k === "2" && !$("pickB").disabled) $("pickB").click();
    else if (k === "n" && !$("next").disabled) $("next").click();
  });
  window.addEventListener("resize", () => { pvBase = null; mapBase = null; redraw(); });

  // the strip's chip (or its play button) flips sound; any line that told the visitor about sound follows it. capture, since the chip rewrites its label and detaches the tapped span; the timeout lets its handler run first
  document.addEventListener("click", e => {
    if (!e.target || !e.target.closest || !e.target.closest("#wk-snd, #wk-go")) return;
    setTimeout(() => {
      if (!S) return;
      if (body.classList.contains("done")) { if (!tourOn && /^sound is off|^press /.test($("now").textContent)) doneLine(); return; }
      const s = S[R];
      if (body.classList.contains("r") && s && s.pick === null && !$("primer").classList.contains("on")) ready();
    }, 0);
  }, true);

  $("next").disabled = true;
  const ld = fetch("../loop/data/loop.json").then(r => r.json()).catch(() => null);
  Promise.all([fetch("pairs.json").then(r => r.json()), ld]).then(a => {
    D = a[0]; LD = a[1]; $("next").disabled = false; drawPreview();
    if (LD && window.WK && WK.famKey) {
      const n = {}; LD.f.forEach(f => { n[f] = (n[f] || 0) + 1; });
      const ids = Object.keys(n).sort((x, y) => n[y] - n[x]).map(f => LD.f.indexOf(+f));
      WK.famKey($("pvfams"), LD, ids); WK.famKey($("mapfams"), LD, ids);
    }
    const m = /[#&]r=([0-9a-f]{24})([0-9a-f]{3})?/.exec(location.hash), ss = m && decodeS(m[1], m[2]);
    if (ss) { S = ss; SHARED = true; showResult(); }
    else { newSession(); showRound(); }
  }).catch(() => { $("status").textContent = "the songs did not load. reload the page."; });
})();
