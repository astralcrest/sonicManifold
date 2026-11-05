/* smReceipt: thermal-slip take-home. no deps, nothing stored. QR: byte mode, v1-6, level L (own encoder). */
(() => {
  const GE = new Array(512), GL = new Array(256);
  for (let i = 0, x = 1; i < 255; i++) { GE[i] = x; GL[x] = i; x <<= 1; if (x & 256) x ^= 285; }
  for (let i = 255; i < 512; i++) GE[i] = GE[i - 255];
  const gmul = (a, b) => (a && b) ? GE[GL[a] + GL[b]] : 0;
  function rs(data, n) {
    let g = [1];
    for (let i = 0; i < n; i++) { const h = new Array(g.length + 1).fill(0); g.forEach((c, j) => { h[j] ^= c; h[j + 1] ^= gmul(c, GE[i]); }); g = h; }
    const r = new Array(n).fill(0);
    data.forEach(b => { const f = b ^ r[0]; r.shift(); r.push(0); for (let i = 0; i < n; i++) r[i] ^= gmul(g[i + 1], f); });
    return r;
  }
  // [total, data, ecPerBlock, blocks]
  const VT = [null, [26, 19, 7, 1], [44, 34, 10, 1], [70, 55, 15, 1], [100, 80, 20, 1], [134, 108, 26, 1], [172, 136, 18, 2]];
  const AL = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]];

  function qr(text) {
    const bytes = Array.from(new TextEncoder().encode(text));
    let v = 1;
    while (v <= 6 && bytes.length > VT[v][1] - 2) v++;
    if (v > 6) throw new Error("too long");
    const [total, dcw, ecb, nb] = VT[v];
    const bits = [];
    const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, 8); bytes.forEach(b => put(b, 8));
    put(0, Math.min(4, dcw * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    const cw = [];
    for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(""), 2));
    for (let p = 0; cw.length < dcw; p ^= 1) cw.push(p ? 0x11 : 0xEC);
    const per = dcw / nb, blocks = [], ecs = [];
    for (let b = 0; b < nb; b++) { const d = cw.slice(b * per, (b + 1) * per); blocks.push(d); ecs.push(rs(d, ecb)); }
    const out = [];
    for (let i = 0; i < per; i++) blocks.forEach(b => out.push(b[i]));
    for (let i = 0; i < ecb; i++) ecs.forEach(e => out.push(e[i]));
    const sz = 17 + 4 * v;
    const M = Array.from({ length: sz }, () => new Array(sz).fill(0));
    const F = Array.from({ length: sz }, () => new Array(sz).fill(false));
    const set = (r, c, d) => { if (r >= 0 && c >= 0 && r < sz && c < sz) { M[r][c] = d ? 1 : 0; F[r][c] = true; } };
    const finder = (r, c) => { for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) { const d = Math.max(Math.abs(i - 3), Math.abs(j - 3)); set(r + i, c + j, d !== 2 && d !== 4); } };
    finder(0, 0); finder(0, sz - 7); finder(sz - 7, 0);
    for (let i = 8; i < sz - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const al = AL[v];
    al.forEach((r, a) => al.forEach((c, b) => {
      if ((a === 0 && b === 0) || (a === 0 && b === al.length - 1) || (a === al.length - 1 && b === 0)) return;
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) set(r + i, c + j, Math.max(Math.abs(i), Math.abs(j)) !== 1);
    }));
    set(sz - 8, 8, true);
    for (let i = 0; i < 9; i++) { if (!F[8][i]) set(8, i, false); if (!F[i][8]) set(i, 8, false); }
    for (let i = 0; i < 8; i++) { set(8, sz - 1 - i, false); set(sz - 1 - i, 8, false); }
    set(sz - 8, 8, true);
    const dbits = [];
    out.forEach(b => put2(b));
    function put2(b) { for (let i = 7; i >= 0; i--) dbits.push((b >>> i) & 1); }
    const MK = [(r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0, (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => (r * c) % 2 + (r * c) % 3 === 0, (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0, (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0];
    const base = M.map(r => r.slice());
    let k = 0, up = true;
    for (let c = sz - 1; c > 0; c -= 2) {
      if (c === 6) c--;
      for (let n = 0; n < sz; n++) {
        const r = up ? sz - 1 - n : n;
        for (let d = 0; d < 2; d++) { const cc = c - d; if (!F[r][cc]) { base[r][cc] = k < dbits.length ? dbits[k] : 0; k++; } }
      }
      up = !up;
    }
    function fmt(mask) {
      const d = (1 << 3) | mask; let r = d << 10;
      for (let i = 14; i >= 10; i--) if ((r >>> i) & 1) r ^= 0x537 << (i - 10);
      return ((d << 10) | r) ^ 0x5412;
    }
    function build(mask) {
      const T = base.map((row, r) => row.map((x, c) => F[r][c] ? x : x ^ (MK[mask](r, c) ? 1 : 0)));
      const f = fmt(mask), g = i => (f >>> i) & 1;
      for (let i = 0; i <= 5; i++) T[i][8] = g(i);
      T[7][8] = g(6); T[8][8] = g(7); T[8][7] = g(8);
      for (let i = 9; i < 15; i++) T[8][14 - i] = g(i);
      for (let i = 0; i < 8; i++) T[8][sz - 1 - i] = g(i);
      for (let i = 8; i < 15; i++) T[sz - 15 + i][8] = g(i);
      T[sz - 8][8] = 1;
      return T;
    }
    function pen(T) {
      let p = 0;
      for (let pass = 0; pass < 2; pass++) for (let a = 0; a < sz; a++) {
        let run = 1;
        for (let b = 1; b < sz; b++) {
          const x = pass ? T[b][a] : T[a][b], y = pass ? T[b - 1][a] : T[a][b - 1];
          if (x === y) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
        }
        const line = []; for (let b = 0; b < sz; b++) line.push(pass ? T[b][a] : T[a][b]);
        const s = line.join("");
        for (const pt of ["10111010000", "00001011101"]) { let i = -1; while ((i = s.indexOf(pt, i + 1)) >= 0) p += 40; }
      }
      for (let r = 0; r < sz - 1; r++) for (let c = 0; c < sz - 1; c++) { const x = T[r][c]; if (x === T[r][c + 1] && x === T[r + 1][c] && x === T[r + 1][c + 1]) p += 3; }
      let dark = 0; T.forEach(r => r.forEach(x => dark += x));
      p += Math.floor(Math.abs(dark * 20 - sz * sz * 10) / (sz * sz)) * 10;
      return p;
    }
    let best = null, bp = 1e9;
    for (let m = 0; m < 8; m++) { const T = build(m), p = pen(T); if (p < bp) { bp = p; best = T; } }
    return best;
  }

  const INK = "#bcd3ff", NIGHT = "#06010f", MUTE = "#8f93b8";
  const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
  const W = 302, S = 3;

  function wrap(g, text, maxw) {
    const out = []; let line = "";
    String(text).split(" ").forEach(w => { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxw && line) { out.push(line); line = w; } else line = t; });
    if (line) out.push(line);
    return out;
  }

  function draw(f, cv) {
    const mat = (() => { try { return f.url ? qr(f.url) : null; } catch (e) { return null; } })();
    const pad = 18, lh = 16, mw = W - pad * 2;
    const meas = document.createElement("canvas").getContext("2d");
    meas.font = `500 12px ${MONO}`;
    const nextL = wrap(meas, f.next, mw);
    const qs = mat ? 150 : 0;
    meas.font = `500 12px ${MONO}`;
    const nrows = f.lines.reduce((n, [k, v]) => { const room = mw - meas.measureText(String(v)).width - 12; return n + (meas.measureText(k).width <= room ? 1 : wrap(meas, k, mw).length + 1); }, 0);
    const H = pad + 52 + nrows * lh + 22 + nextL.length * lh + 18 + (qs ? qs + 34 : 0) + 22 + pad;
    cv.width = W * S; cv.height = Math.ceil(H) * S;
    const g = cv.getContext("2d");
    g.setTransform(S, 0, 0, S, 0, 0);
    g.fillStyle = NIGHT; g.fillRect(0, 0, W, H);
    g.fillStyle = INK; g.textBaseline = "alphabetic";
    let y = pad + 10;
    g.font = `500 11px ${MONO}`; g.fillStyle = MUTE; g.fillText("astralcrest · sonicManifold", pad, y);
    y += 24; g.font = `500 17px ${MONO}`; g.fillStyle = INK; g.fillText(f.title.toLowerCase(), pad, y);
    y += 18; g.font = `400 11px ${MONO}`; g.fillStyle = MUTE; g.fillText(f.sub || "your slip", pad, y);
    const rule = yy => { g.strokeStyle = MUTE; g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(pad, yy + .5); g.lineTo(W - pad, yy + .5); g.stroke(); g.setLineDash([]); };
    y += 12; rule(y); y += 20;
    g.font = `500 12px ${MONO}`;
    f.lines.forEach(([k, v]) => {
      const vs = String(v), vw = g.measureText(vs).width, room = W - 2 * pad - vw - 12;
      g.textAlign = "left";
      if (g.measureText(k).width <= room) {
        g.fillStyle = MUTE; g.fillText(k, pad, y);
        g.fillStyle = INK; g.textAlign = "right"; g.fillText(vs, W - pad, y); y += lh;
      } else {
        g.fillStyle = MUTE; wrap(g, k, W - 2 * pad).forEach(l => { g.fillText(l, pad, y); y += lh; });
        g.fillStyle = INK; g.textAlign = "right"; g.fillText(vs, W - pad, y); y += lh;
      }
    });
    g.textAlign = "left"; y += 2; rule(y); y += 20;
    g.fillStyle = INK; g.font = `500 12px ${MONO}`;
    nextL.forEach(l => { g.fillText(l, pad, y); y += lh; });
    y += 2;
    if (mat) {
      const n = mat.length, q = 2, mod = Math.floor(qs / (n + 2 * q)), side = mod * (n + 2 * q), x0 = Math.round((W - side) / 2);
      g.fillStyle = INK; g.fillRect(x0, y, side, side);
      g.fillStyle = NIGHT;
      mat.forEach((row, r) => row.forEach((d, c) => { if (d) g.fillRect(x0 + (c + q) * mod, y + (r + q) * mod, mod, mod); }));
      y += side + 18; g.textAlign = "center"; g.font = `400 10px ${MONO}`; g.fillStyle = MUTE;
      g.fillText("scan to reopen this slip", W / 2, y); y += 18;
    }
    g.textAlign = "center"; g.fillStyle = MUTE; g.font = `400 10px ${MONO}`;
    g.fillText("nothing was stored. a toy.", W / 2, y);
    y += 14; g.fillText(f.foot || "astralcrest.github.io/sonicManifold", W / 2, y);
    g.textAlign = "left";
    cv.style.height = (cv.height / S) + "px";
    cv.setAttribute("role", "img");
    cv.setAttribute("aria-label", f.title + ": " + f.lines.map(l => l.join(" ")).join(", ") + ". " + f.next);
  }

  function css() {
    if (document.getElementById("smr-css")) return;
    const s = document.createElement("style"); s.id = "smr-css";
    s.textContent = `#smr{border:1px solid #2a2140;background:#06010f;color:#bcd3ff;padding:14px;max-width:min(92vw,346px);max-height:92vh;overflow:auto;margin:auto}
#smr::backdrop{background:#06010fe6}
#smr canvas{display:block;width:302px;max-width:100%;border:1px dashed #8f93b8;margin:0 auto}
#smr .smr-b{display:flex;gap:8px;margin-top:12px;justify-content:center}
#smr button{font:500 13px "Instrument Sans",system-ui,sans-serif;min-height:44px;min-width:76px;padding:0 14px;color:#bcd3ff;background:transparent;border:1px solid #2a2140;border-radius:0;cursor:pointer}
#smr button.go{background:#bcd3ff;color:#06010f;border-color:#bcd3ff}
#smr button:focus-visible{outline:2px solid #21f6bc;outline-offset:2px}
@media print{@page{size:80mm auto;margin:0}html,body{background:#fff!important}body>*:not(#smr){display:none!important}
#smr{position:static!important;display:block!important;border:0;padding:0;margin:0;width:80mm;max-width:none;max-height:none;overflow:visible;background:#fff}
#smr::backdrop{display:none}#smr canvas{width:80mm;max-width:none;height:auto!important;border:0;filter:invert(1)}#smr .smr-b{display:none}}`;
    document.head.appendChild(s);
  }

  let dlg = null, opener = null;
  function receipt(f) {
    css();
    opener = document.activeElement;
    if (dlg) dlg.remove();
    dlg = document.createElement("dialog"); dlg.id = "smr";
    dlg.setAttribute("aria-label", "take-home slip");
    const cv = document.createElement("canvas");
    const bar = document.createElement("div"); bar.className = "smr-b";
    const mk = (t, cls, fn) => { const b = document.createElement("button"); b.type = "button"; b.textContent = t; if (cls) b.className = cls; b.onclick = fn; bar.appendChild(b); return b; };
    mk("save", "go", () => cv.toBlob(bl => {
      const a = document.createElement("a"); a.href = URL.createObjectURL(bl); a.download = (f.wall || "slip") + "_receipt.png";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      note("saved to your device.");
    }, "image/png"));
    mk("print", "", () => { window.print(); note("sent to your printer."); });
    mk("close", "", () => closeSlip());
    const nt = document.createElement("p"); nt.setAttribute("role", "status"); nt.style.cssText = "margin:6px 0 0;font:12px/1.4 'IBM Plex Mono',monospace;color:#bcd3ff;min-height:1.4em";
    const note = t => { nt.textContent = t; };
    dlg.append(cv, bar, nt);
    const h0 = location.hash;
    if (!/[#&]slip\b/.test(h0)) { try { history.pushState({ smslip: 1 }, "", (h0 || "#") + (h0 && h0 !== "#" ? "&slip" : "slip")); pushed = true; } catch (e) {} }
    document.body.appendChild(dlg);
    draw(f, cv);
    dlg.addEventListener("cancel", () => { dlg.__esc = 1; });
    dlg.addEventListener("close", () => {
      if (pushed) { pushed = false; try { history.back(); } catch (e) {} } try { opener && opener.focus(); } catch (e) {} });
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (dlg && dlg.open) draw(f, cv); });
    return dlg;
  }
  let pushed = false;
  function closeSlip(quiet) {
    if (!dlg) return;
    if (quiet && pushed) { pushed = false; try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
    try { dlg.close(); } catch (e) { dlg.removeAttribute("open"); }
  }
  addEventListener("popstate", () => { if (dlg && dlg.open && !/[#&]slip\b/.test(location.hash)) { pushed = false; closeSlip(); } });
  window.smReceipt = receipt;
  window.smReceipt.close = closeSlip;
  window.smReceipt.qr = qr;
})();
