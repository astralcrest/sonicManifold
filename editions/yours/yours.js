/* your own data: a visitor's artists placed on my 2D sound map (front/data/field.json: n = names, xy = 0..1000, h = plays).
   names match by spelling only (case, accents, punctuation ignored). a file is parsed in memory by a reviver that keeps
   five fields and drops the rest before any code sees them; nothing is stored or sent. */
(function () {
'use strict';
var KEEP = { master_metadata_album_artist_name: 1, artistName: 1, ms_played: 1, msPlayed: 1, ts: 1, endTime: 1, incognito_mode: 1 };
var FILE_RE = /^(StreamingHistory\d+|StreamingHistory_music_\d+|Streaming_History_Audio_[\w-]+)\.json$/i;
var TOP_FILE = 50;
var FOLD = { 'ø': 'o', 'æ': 'ae', 'œ': 'oe', 'ß': 'ss', 'ł': 'l', 'đ': 'd', 'ð': 'd', 'þ': 'th', 'ı': 'i' };

function norm(s) {
  return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[øæœßłđðþı]/g, function (c) { return FOLD[c]; })
    .replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function noThe(k) { return k.indexOf('the ') === 0 ? k.slice(4) : k; }

/* index the field's names the way two.js does (first spelling wins), plus a "the"-less alias when it is unambiguous */
function makeIndex(names) {
  var idx = new Map(), alt = new Map();
  names.forEach(function (n, i) {
    var k = norm(n); if (!k) return;
    if (!idx.has(k)) idx.set(k, i);
    var a = noThe(k); alt.set(a, alt.has(a) && alt.get(a) !== i ? -1 : i);
  });
  return function (s) {
    var k = norm(s); if (!k) return -1;
    if (idx.has(k)) return idx.get(k);
    var a = alt.get(noThe(k));
    return a === undefined ? -1 : a;
  };
}

/* a pasted line may carry a rank ("1. ", "#2", "3)") or a bullet; "50 Cent" keeps its number because the raw line is tried first */
function stripRank(t) { return t.replace(/^\s*(?:#?\d+\s*[.)\]:-]?|[-*•·])\s*/, '').trim(); }
function lookup(find, t) {
  var i = find(t); if (i > -1) return [t, i];
  var s = stripRank(t); if (s !== t) { i = find(s); if (i > -1) return [s, i]; }
  return [s, -1];
}
/* comma lists: rejoin neighbors when the joined piece is a known name ("quickly, quickly") */
function splitNames(text, find) {
  var out = [];
  String(text || '').split(/\r?\n|;|\t/).forEach(function (line) {
    line = line.trim(); if (!line || /^[\s#\d.)\]:,-]*$/.test(line)) return;
    if (line.indexOf(',') < 0 || lookup(find, line)[1] > -1) { out.push(line); return; }
    var p = line.split(','), i = 0, j, hit;
    while (i < p.length) {
      hit = false;
      for (j = p.length; j > i + 1; j--) { var s = p.slice(i, j).join(',').trim(); if (lookup(find, s)[1] > -1) { out.push(s); i = j; hit = true; break; } }
      if (!hit) { if (p[i].trim()) out.push(p[i].trim()); i++; }
    }
  });
  return out;
}
/* names in rank order -> placed [{name, i, rank}] and off [name], one entry per map artist or off-map spelling; dup = repeats dropped */
function placeNames(names, find) {
  var seen = new Set(), placed = [], off = [], dup = 0;
  names.forEach(function (raw) {
    var r = lookup(find, raw), k = norm(r[0]); if (!k) return;
    var key = r[1] > -1 ? 'i' + r[1] : 'o' + noThe(k);
    if (seen.has(key)) { dup++; return; } seen.add(key);
    if (r[1] < 0) { off.push(r[0]); return; }
    placed.push({ name: r[0], i: r[1], rank: placed.length + off.length + 1 });
  });
  return { placed: placed, off: off, n: placed.length + off.length, dup: dup };
}

/* the file: only five keys survive the parse; username, ip, platform, country, user agent never reach a variable */
function parseHistory(text) {
  var arr = JSON.parse(text, function (k, v) { return k === '' || /^\d+$/.test(k) || KEEP[k] ? v : undefined; });
  return Array.isArray(arr) ? arr : [];
}
function rankRows(rows) {
  var by = new Map(), plays = 0, y0 = '', y1 = '';
  rows.forEach(function (p) {
    if (!p || p.incognito_mode === true) return;
    var a = p.master_metadata_album_artist_name || p.artistName || '', ms = +(p.ms_played != null ? p.ms_played : p.msPlayed) || 0;
    if (!a || ms < 30000) return;
    plays++;
    var y = String(p.ts || p.endTime || '').slice(0, 4);
    if (/^\d{4}$/.test(y)) { if (!y0 || y < y0) y0 = y; if (!y1 || y > y1) y1 = y; }
    var k = norm(a), e = by.get(k);
    if (e) e[1]++; else by.set(k, [a, 1]);
  });
  var list = Array.from(by.values()).sort(function (x, y) { return y[1] - x[1]; });
  return { names: list.slice(0, TOP_FILE).map(function (e) { return e[0]; }), plays: plays, artists: list.length, y0: y0, y1: y1 };
}

var api = { norm: norm, makeIndex: makeIndex, splitNames: splitNames, placeNames: placeNames, parseHistory: parseHistory, rankRows: rankRows, FILE_RE: FILE_RE };
if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

/* ---- the page ---- */
var $ = function (id) { return document.getElementById(id); };
var NIGHT = '#06010f', ICE = '#bcd3ff', MUTE = '#9a90b8', INK = '#efe9ff';
/* the site's fixed family key (front/field.js FAMC) */
var FAMC = { 'ambient/lofi': '#3d8bff', 'classical': '#7fd37f', 'electronic': '#ff4fa3', 'experimental': '#b8ec4a', 'folk/country': '#d9a066', 'funk/disco': '#ffb3c6', 'hip-hop · r&b': '#ff5c7a', 'jazz': '#d9b8ff', 'other': '#9a90b8', 'pop': '#ff8fd6', 'rock/metal': '#c9c2ff', 'soundtrack': '#38c2d6', 'world/desi': '#ea5a2a', 'untagged': '#6f6790' };
var F = null, find = null, R = null, TOT = null, FC = null, FL = null, EDGE = null, MAXT = 1, cv = $('map'), cx = cv.getContext('2d'), W = 0, D = 1, HOT = -1;
var EXAMPLE = 'Frank Ocean\nSZA\nRadiohead\nBonobo\nTaylor Swift\nKendrick Lamar\nBurial\nolafur arnalds\nFour Tet\nBillie Eilish\nNils Frahm\nA.R. Rahman\nThe Beatles\nKhruangbin\nArijit Singh';
var URL_PUB = 'https://astralcrest.github.io/sonicManifold/editions/yours/';

function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
function pl(n, w) { return fmt(n) + ' ' + w + (n === 1 ? '' : 's'); }
function dupNote(res) { return res.dup ? ' ' + pl(res.dup, 'duplicate') + ' dropped.' : ''; }
function st(msg, err) { var e = $('st'); e.textContent = msg; e.className = 'st' + (err ? ' err' : ''); }

function size() {
  var w = Math.round(cv.parentNode.getBoundingClientRect().width); D = Math.min(3, window.devicePixelRatio || 1);
  if (!w || (w === W && cv.width === Math.round(w * D))) return;
  W = w; cv.width = Math.round(w * D); cv.height = Math.round(w * D); draw();
}
function pos(i) { var p = F.xy[i], m = 14; return [m + p[0] / 1000 * (W - 2 * m), m + p[1] / 1000 * (W - 2 * m)]; }
function dot(x, y, r) { cx.beginPath(); cx.arc(x * D, y * D, r * D, 0, 6.2832); }
function rOf(k, n) { return n < 2 ? 6 : 6.5 - 3 * (k / (n - 1)); }

function draw() {
  if (!F || !W) return;
  cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = NIGHT; cx.fillRect(0, 0, cv.width, cv.height);
  var i, p, on = R ? new Set(R.placed.map(function (e) { return e.i; })) : null;
  cx.globalAlpha = 0.75;
  /* the map clamps its outliers to the frame (a coordinate of exactly 0 or 1000): those are drawn hollow, since the spot is not their real one */
  cx.lineWidth = 1.2 * D;
  for (i = 0; i < F.n.length; i++) {
    if (on && on.has(i)) continue; p = pos(i);
    if (EDGE[i]) { cx.strokeStyle = FC[i]; dot(p[0], p[1], Math.max(2.4, 0.9 + 1.5 * Math.sqrt(TOT[i] / MAXT))); cx.stroke(); }
    else { cx.fillStyle = FC[i]; dot(p[0], p[1], 0.9 + 1.5 * Math.sqrt(TOT[i] / MAXT)); cx.fill(); }
  }
  cx.globalAlpha = 1;
  if (!R) return;
  var L = R.placed, n = L.length, r;
  /* yours = an ice disc inside an ice ring, so it never reads as a rock/metal dot */
  cx.lineWidth = 1.5 * D; cx.strokeStyle = ICE;
  for (i = n - 1; i >= 0; i--) { p = pos(L[i].i); r = rOf(i, n); cx.fillStyle = NIGHT; dot(p[0], p[1], r + 4); cx.fill(); dot(p[0], p[1], r + 2.5); cx.stroke(); cx.fillStyle = ICE; dot(p[0], p[1], r); cx.fill(); }
  var lab = Math.min(n, W < 500 ? 3 : 6);
  cx.font = '500 ' + 12 * D + 'px "IBM Plex Mono", monospace'; cx.textBaseline = 'middle'; cx.lineJoin = 'round';
  for (i = 0; i < lab; i++) label(L[i], i, n, false);
  if (HOT > -1) { var h = L.filter(function (e) { return e.i === HOT; })[0]; if (h) { p = pos(HOT); cx.strokeStyle = INK; cx.lineWidth = 1.5 * D; dot(p[0], p[1], rOf(L.indexOf(h), n) + 6.5); cx.stroke(); label(h, L.indexOf(h), n, true); } }
}
function label(e, k, n, force) {
  var p = pos(e.i), t = e.rank + ' ' + e.name, w = cx.measureText(t).width / D, r = rOf(k, n) + 8;
  var x = p[0] + r + w > W - 4 ? p[0] - r - w : p[0] + r, y = Math.max(10, Math.min(W - 10, p[1]));
  cx.lineWidth = 4 * D; cx.strokeStyle = NIGHT; cx.textAlign = 'left';
  cx.strokeText(t, x * D, y * D); cx.fillStyle = force ? INK : ICE; cx.fillText(t, x * D, y * D);
}

function show(res, how) {
  res.placed.forEach(function (e) { e.name = F.n[e.i]; });
  R = res; HOT = -1;
  $('np').textContent = fmt(res.placed.length);
  $('noff').textContent = res.n ? fmt(res.placed.length) + ' placed, ' + fmt(res.off.length) + ' off my map' : 'no names yet';
  $('line').hidden = !res.n;
  $('pl').textContent = res.placed.map(function (e) { return e.rank + ' ' + e.name; }).join(' · ') || 'none';
  $('of').textContent = res.off.join(' · ') || 'none';
  $('lists').hidden = !res.n;
  $('copy').disabled = !res.n;
  $('tap').textContent = res.placed.length ? 'tap an ice mark to name it.' : '';
  if (how) st(how);
  draw();
  /* one column (phone): the map sits under the list, so bring it into view or the press shows nothing */
  var pic = cv.parentNode.parentNode, b = pic.getBoundingClientRect(), calm = false;
  try { calm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* no hint */ }
  if (window.matchMedia && matchMedia('(max-width:900px)').matches && (b.top < 0 || b.top > innerHeight * 0.4)) pic.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
}
function fromPaste() {
  if (!F) return;
  var names = splitNames($('names').value, find);
  var res = names.length ? placeNames(names, find) : null;
  if (!res || !res.n) { st('paste a few artist names first, one per line.', true); return; }
  show(res, 'placed your list of ' + pl(res.n, 'name') + '.' + dupNote(res));
}

function readFiles(files) {
  if (!F) return;
  var all = Array.prototype.slice.call(files || []), ok = all.filter(function (f) { return FILE_RE.test(f.name); }), skip = all.length - ok.length;
  if (!ok.length) { st('no streaming history files there. only StreamingHistory0.json, StreamingHistory_music_0.json or Streaming_History_Audio_*.json (any number) are read.', true); return; }
  st('reading ' + ok.length + ' file' + (ok.length > 1 ? 's' : '') + ' in this tab');
  var rows = [], bad = 0;
  Promise.all(ok.map(function (f) {
    return f.text().then(function (t) { try { var a = parseHistory(t); for (var k = 0; k < a.length; k++) rows.push(a[k]); } catch (e) { bad++; } }, function () { bad++; });
  })).then(function () {
    var r = rankRows(rows); rows = null;
    if (!r.plays) { st('no plays over 30 seconds with an artist name in ' + (ok.length > 1 ? 'those files.' : 'that file.'), true); return; }
    $('names').value = '';
    var yrs = r.y0 ? (r.y0 === r.y1 ? ', ' + r.y0 : ', ' + r.y0 + ' to ' + r.y1) : '';
    var res = placeNames(r.names, find), k = Math.min(TOP_FILE, r.artists);
    show(res, pl(r.plays, 'play') + ' over 30 s, ' + pl(r.artists, 'artist') + yrs + '. ' + (k === 1 ? 'placing it.' : 'placing your ' + k + ' most played.') + dupNote(res) + (skip ? ' skipped ' + skip + ' other file' + (skip > 1 ? 's' : '') + ' unread.' : '') + (bad ? ' ' + bad + ' file' + (bad > 1 ? 's' : '') + ' did not parse.' : ''));
  });
}

function copy() {
  if (!R || !R.n) return;
  var t = R.placed.length + ' placed, ' + R.off.length + ' off the map: ' + (R.n === 1 ? 'my top artist' : 'my top ' + R.n + ' artists') + ' on astralcrest’s sound map. ' + URL_PUB, b = $('copy');
  var done = function () { b.textContent = 'copied'; setTimeout(function () { b.textContent = 'copy my placement'; }, 1800); };
  var old = function () { var a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); done(); } catch (e) {} a.remove(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, old); else old();
}

function tap(ev) {
  if (!F || !W) return;
  var b = cv.getBoundingClientRect(), x = ev.clientX - b.left, y = ev.clientY - b.top, best = -1, bd = 1e9, mine = true, i, p, d;
  if (R) R.placed.forEach(function (e) { p = pos(e.i); d = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y); if (d < bd && d < 24 * 24) { bd = d; best = e.i; mine = false; } });
  if (best < 0) for (i = 0; i < F.n.length; i++) { p = pos(i); d = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y); if (d < bd && d < 14 * 14) { bd = d; best = i; } }
  HOT = mine ? -1 : best;
  var e = $('tap');
  if (best < 0) e.textContent = R && R.placed.length ? 'tap an ice mark to name it.' : '';
  else if (!mine) { var h = R.placed.filter(function (q) { return q.i === best; })[0]; e.textContent = h.name + ' (' + FL[best] + '): your number ' + h.rank + ', and on my map.'; }
  else e.textContent = F.n[best] + ' (' + FL[best] + '): on my map only.';
  draw();
}

$('place').addEventListener('click', fromPaste);
$('try').addEventListener('click', function () { $('names').value = EXAMPLE; fromPaste(); st('a made-up list; no real person listened to it.'); });
$('copy').addEventListener('click', copy);
$('file').addEventListener('change', function () { readFiles(this.files); this.value = ''; });
cv.addEventListener('pointerdown', tap);
var dz = $('drop');
['dragenter', 'dragover'].forEach(function (t) { dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
['dragleave', 'drop'].forEach(function (t) { dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
dz.addEventListener('drop', function (e) { readFiles(e.dataTransfer && e.dataTransfer.files); });
window.addEventListener('dragover', function (e) { e.preventDefault(); });
window.addEventListener('drop', function (e) { e.preventDefault(); });
if (window.ResizeObserver) new ResizeObserver(size).observe(cv.parentNode); else window.addEventListener('resize', size);

fetch('../../front/data/field.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) {
  F = j; find = makeIndex(F.n);
  TOT = F.h.map(function (h) { return h[0] + h[1] + h[2]; }); MAXT = Math.max.apply(null, TOT) || 1;
  EDGE = F.xy.map(function (q) { return q[0] === 0 || q[0] === 1000 || q[1] === 0 || q[1] === 1000; });
  var fa = F.fa && F.fa.length === F.n.length ? F.fa : F.f, has = {};
  FC = fa.map(function (k) { has[k] = 1; return FAMC[F.fam[k]] || MUTE; }); FL = fa.map(function (k) { return F.fam[k] || 'untagged'; });
  F.fam.forEach(function (nm, k) { if (!has[k]) return; var s = document.createElement('span'), i = document.createElement('i'); i.className = 'sw'; i.style.background = FAMC[nm] || MUTE; s.appendChild(i); s.appendChild(document.createTextNode(nm)); $('fams').appendChild(s); });
  $('nmine').textContent = fmt(F.n.length);
  $('noff').textContent = 'paste your list below';
  $('place').disabled = false; size(); draw();
}).catch(function () { st('the map did not load here. reload to try again.', true); });
})();
