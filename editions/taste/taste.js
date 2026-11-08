(() => {
  const CLIP = 8000, FALLBACK = 2500, ROUNDS = 12;
  const $ = id => document.getElementById(id);
  const body = document.body;
  let D = null, S = null, R = 0, heard = [false, false];
  const audio = new Audio();
  audio.preload = "none";
  let clip = null;

  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const half = () => shuffle([0, 0, 0, 1, 1, 1]);

  function stopClip() {
    if (!clip) return;
    clearTimeout(clip.fb); clearTimeout(clip.end); cancelAnimationFrame(clip.raf);
    audio.onplaying = audio.onerror = null;
    try { audio.pause(); } catch (e) {}
    const c = clip; clip = null;
    if (c.btn) c.btn.classList.remove("playing");
    c.meter.style.width = "0";
    c.done && c.done();
  }

  function playClip(url, meter, btn, done) {
    stopClip();
    const c = clip = { meter, btn, done, t0: 0 };
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
    audio.onplaying = go;
    audio.onerror = go;
    c.fb = setTimeout(go, FALLBACK);
    audio.src = url;
    try { const p = audio.play(); if (p && p.catch) p.catch(go); } catch (e) { go(); }
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

  function showRound() {
    const s = S[R], p = D.pairs[s.pi];
    body.className = "r";
    if (!/kiosk=1/.test(location.search)) try { history.replaceState(null, "", location.pathname + location.search + "#n=" + (R + 1)); } catch (e) {}
    $("rk").textContent = `round ${R + 1} of ${ROUNDS}`;
    $("tk").textContent = R + 1; $("tkl").textContent = `of ${ROUNDS} rounds`;
    heard = [false, false];
    ["A", "B"].forEach((L, side) => {
      $("c" + L).classList.remove("won");
      $("n" + L).textContent = "the name shows after you pick";
      $("pick" + L).disabled = true;
      $("play" + L).disabled = s.primed;
      $("m" + L).style.width = "0";
    });
    $("next").disabled = true;
    $("next").textContent = R === ROUNDS - 1 ? "see the result" : "next";
    if (s.primed) {
      $("primer").classList.add("on");
      $("status").innerHTML = '<span class="a">priming.</span> a third song plays first. just listen; you do not pick this one.';
      const pr = p.pr[s.target];
      playClip(pr.u, $("pm"), null, () => {
        if (S[R] !== s) return;
        $("primer").classList.remove("on");
        ready();
      });
    } else {
      $("primer").classList.remove("on");
      ready();
    }
  }

  function ready() {
    $("status").textContent = S[R].primed ? "primed. now play a and b and pick the one you like more. did the first song pull you?" : "no priming this round: a cold pick. play a and b, then pick the one you like more.";
    $("playA").disabled = $("playB").disabled = false;
  }

  function play(side) {
    const s = S[R], p = D.pairs[s.pi];
    const L = side ? "B" : "A";
    if (clip && clip.btn === $("play" + L)) { stopClip(); return; }
    heard[side] = true;
    playClip(p.o[sideOpt(s, side)].u, $("m" + L), $("play" + L), null);
    if (heard[0] && heard[1] && s.pick === null) { $("pickA").disabled = $("pickB").disabled = false; }
  }

  function pick(side) {
    const s = S[R], p = D.pairs[s.pi];
    if (s.pick !== null) return;
    stopClip();
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
  }

  function plural(x) { return x === 1 ? "1 time" : `${x} times`; }

  function showResult() {
    stopClip();
    body.className = "done";
    let k = 0, m = 0;
    S.forEach(s => { if (s.pick === s.target) s.primed ? k++ : m++; });
    $("sent").textContent = `after a first song, you went toward it ${k} of 6 times. with none, ${m} of 6.`;
    $("bk").textContent = `${k} of 6`; $("bm").textContent = `${m} of 6`;
    $("tk").textContent = `${k} of 6`; $("tkl").textContent = "toward the first song";
    $("ik").style.width = (k / 6 * 100) + "%"; $("im").style.width = (m / 6 * 100) + "%";
    const log = $("log"); log.textContent = "";
    S.forEach((s, r) => {
      const p = D.pairs[s.pi], li = document.createElement("li");
      const b = document.createElement("b"); b.textContent = p.o[s.pick].n;
      li.append(`${String(r + 1).padStart(2, "0")} · `, b, ` over ${p.o[1 - s.pick].n}`);
      if (s.primed) { const e = document.createElement("em"); e.textContent = ` · first: ${p.pr[s.target].n} · near ${p.o[s.target].n}` + (s.pick === s.target ? " · you went with it" : " · you went against it"); li.append(e); }
      log.append(li);
    });
    $("next").disabled = false; $("next").textContent = "again";
    drawMap();
    try { history.replaceState(null, "", "#r=" + encodeS()); } catch (e) {}
    window.scrollTo(0, 0);
  }

  const encodeS = () => S.map(s => (((s.pi << 3) | (s.primed ? 4 : 0) | (s.target << 1) | s.pick) & 255).toString(16).padStart(2, "0")).join("");
  function decodeS(h) {
    if (!/^[0-9a-f]{24}$/.test(h)) return null;
    const out = [];
    for (let i = 0; i < 24; i += 2) {
      const b = parseInt(h.substr(i, 2), 16), pi = b >> 3;
      if (pi >= D.pairs.length) return null;
      out.push({ pi, primed: !!(b & 4), target: (b >> 1) & 1, targetOnA: true, pick: b & 1 });
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
    const d = k - m;
    return {
      wall: "taste", title: "the taste test", sub: "twelve rounds, a toy",
      lines: [["with a first song", k + " of 6"], ["with none", m + " of 6"], ["gap (a toy: picks toward the first song, minus without)", (d > 0 ? "+" : "") + d], ["picked vs passed: how far apart", Math.round(span / S.length) + "% of map"], ["how scattered your picks are", Math.round(spread) + "% of map"]],
      next: "your picks are lit on the sound map at the link below. a toy.",
      url: "https://astralcrest.github.io/sonicManifold/editions/taste/#r=" + encodeS(),
      foot: "a toy, not a finding"
    };
  }
  $("slip").onclick = () => { if (S && window.smReceipt) window.smReceipt(slipFields()); };

  function reset() {
    stopClip(); S = null; R = 0;
    if (window.smReceipt && window.smReceipt.close) window.smReceipt.close(true);
    body.className = "";
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    $("next").textContent = "start"; $("next").disabled = !D;
    drawPreview(); window.scrollTo(0, 0);
    if (D) { newSession(); showRound(); }
  }

  const PK = window.WK && window.WK.P;
  function field(g, X, Y, w, col) {
    const small = w < 420;
    if (PK) PK.field(g, D.xy, X, Y, { lo: small ? 1.6 : 2.2, hi: small ? 4.5 : 7, core: 0.75, col: () => col });
    else { g.fillStyle = col; for (let i = 0; i < D.xy.length; i++) g.fillRect(X(i) - 1, Y(i) - 1, 2, 2); }
  }
  function drawMap() {
    const cv = $("map"), dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.round(cv.getBoundingClientRect().width) || 560;
    cv.width = cv.height = w * dpr;
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#06010f"; g.fillRect(0, 0, w, w);
    const pad = 14, sc = (w - 2 * pad) / 1000;
    const X = i => pad + D.xy[i][0] * sc, Y = i => pad + (1000 - D.xy[i][1]) * sc;
    field(g, X, Y, w, "#4f4282");
    const P = (i) => [X(i), Y(i)];
    const ln = (i, j, a, b, wd, al, dash) => { if (PK) PK.ribbon(g, [P(i), P(j)], a, b, wd, al, dash); else { g.strokeStyle = a; g.lineWidth = 1; g.setLineDash(dash || []); g.beginPath(); g.moveTo(X(i), Y(i)); g.lineTo(X(j), Y(j)); g.stroke(); g.setLineDash([]); } };
    S.forEach(s => { if (!s.primed) { const p = D.pairs[s.pi]; ln(p.o[s.pick].i, p.o[1 - s.pick].i, "#3a3058", "#3a3058", 1, 1); } });
    S.forEach(s => { if (s.primed) { const p = D.pairs[s.pi]; ln(p.o[s.pick].i, p.o[1 - s.pick].i, "#f5a623", "#f5a623", 1, 0.8, [3, 4]); } });
    S.forEach(s => { if (s.primed) { const p = D.pairs[s.pi]; ln(p.pr[s.target].i, p.o[s.target].i, "#f5a623", "#ffd8a0", 2, 1); } });
    const sq = (i, s, fill, col, kind) => {
      if (PK) { PK.glyph(g, kind || (fill ? "dot" : "ring"), X(i), Y(i), s * 0.9, col); return; }
      const x = Math.round(X(i) - s / 2), y = Math.round(Y(i) - s / 2);
      if (fill) { g.fillStyle = col; g.fillRect(x, y, s, s); }
      else { g.strokeStyle = col; g.lineWidth = 1.5; g.strokeRect(x + .75, y + .75, s - 1.5, s - 1.5); }
    };
    S.forEach(s => { const p = D.pairs[s.pi]; sq(p.o[1 - s.pick].i, 10, false, "#efe9ff", "ring"); });
    S.forEach(s => sq(D.pairs[s.pi].o[s.pick].i, 10, true, "#21f6bc", "star"));
    S.forEach(s => { if (s.primed) sq(D.pairs[s.pi].pr[s.target].i, 7, true, "#f5a623", "dot"); });
  }

  $("playA").onclick = () => play(0);
  $("playB").onclick = () => play(1);
  $("pickA").onclick = () => pick(0);
  $("pickB").onclick = () => pick(1);
  $("next").onclick = () => {
    if (!D) return;
    if (body.classList.contains("done") || !S) { newSession(); showRound(); return; }
    if (S[R].pick === null) return;
    if (R === ROUNDS - 1) { showResult(); return; }
    R++; showRound();
  };
  function drawPreview() {
    const cv = $("pv"), w = Math.round(cv.getBoundingClientRect().width);
    if (!w || !D) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = cv.height = w * dpr;
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#06010f"; g.fillRect(0, 0, w, w);
    const pad = 14, sc = (w - 2 * pad) / 1000;
    field(g, i => pad + D.xy[i][0] * sc, i => pad + (1000 - D.xy[i][1]) * sc, w, "#7a66c8");
  }
  window.addEventListener("resize", () => { if (body.classList.contains("done")) drawMap(); else drawPreview(); });

  $("next").disabled = true;
  fetch("pairs.json").then(r => r.json()).then(d => { D = d; $("next").disabled = false; drawPreview();
    const m = /[#&]r=([0-9a-f]{24})/.exec(location.hash), ss = m && decodeS(m[1]);
    if (ss) { S = ss; showResult(); if (window.smReceipt) window.smReceipt(slipFields()); }
    else { newSession(); showRound(); }
  });
})();
