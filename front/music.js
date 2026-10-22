/* the front's sound (R21 F2). the soundtrack is one <audio>, made on the first press anywhere on the page and driven by the
   album section and one dock. a press on a link that leaves, on a spotify chip or on the album's own controls is not that
   press; localStorage "sm.sound" = "off" (the record and the lab read the same key) and save-data / reduced-data leave it to a
   play press. spotify: a chip loads spotify's iframe api on its first press (nothing from spotify loads before that), one
   controller plays in a small card under the chips, and one sound plays at a time: spotify holds the soundtrack, which comes
   back when spotify pauses or ends. */
(function () {
'use strict';
var doc = document, html = doc.documentElement;
var $ = function (s, r) { return (r || doc).querySelector(s); };
var led = function () { return window.__ledger || {}; };
var pad2 = function (n) { return String(n).padStart(2, '0'); };
var each = function (l, f) { Array.prototype.forEach.call(l, f); };
var PLAY = '▶︎', PAUSE = '‖';
var BED = 'audio/bed/', TRACK = 'https://open.spotify.com/track/', API = 'https://open.spotify.com/embed/iframe-api/v1';
var KEY = 'sm.sound', SKEY = 'sm.album';
var UA = navigator.userAgent || '';
/* webkit starts no cross-origin frame from the page's own press: iphone, ipad (ipados says MacIntel) and desktop safari */
var WK = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
  (/Safari/.test(UA) && !/Chrome|Chromium|CriOS|Edg|OPR|Android|Firefox|FxiOS/.test(UA));
var lite = false;
try { lite = !!(navigator.connection && navigator.connection.saveData) || matchMedia('(prefers-reduced-data: reduce)').matches; } catch (e) { /* optional hints */ }
var COPY = {
  why: '30 s here; the whole song if you’re signed in to Premium on desktop Chrome or Edge.',
  tap: 'press ▶︎ in the player once; this browser starts it only from there.',
  dead: 'Spotify did not load here. the link opens the song.',
  gone: 'Spotify cannot play this one here. the link opens it.'
};

function lsGet() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
function lsSet(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* storage blocked: this visit still obeys */ } }
function ssGet() { try { return JSON.parse(sessionStorage.getItem(SKEY) || 'null') || {}; } catch (e) { return {}; } }
function ssSet(o) { try { sessionStorage.setItem(SKEY, JSON.stringify(o)); } catch (e) { /* see lsSet */ } }
function getJSON(n) {
  var V = led().V || {};
  return fetch('front/data/' + n + '.json?v=' + (V[n] || '0'), { credentials: 'same-origin' }).then(function (r) {
    if (!r.ok) throw new Error(n + ' ' + r.status);
    return r.json();
  });
}
function mk(tag, cls, parent) { var e = doc.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
/* a glyph hidden from screen readers, then the words; rewritten only when they change */
function lbl(b, g, t) {
  var k = g + t; if (b._k === k) return; b._k = k;
  b.textContent = '';
  mk('span', '', b).textContent = g; b.firstChild.setAttribute('aria-hidden', 'true');
  b.appendChild(doc.createTextNode(' ' + t));
}
function near(sel, margin, f) {
  var s = $(sel); if (!s) return;
  if (!('IntersectionObserver' in window)) { f(); return; }
  var io = new IntersectionObserver(function (es) { for (var i = 0; i < es.length; i++) if (es[i].isIntersecting) { io.disconnect(); f(); return; } }, { rootMargin: margin });
  io.observe(s);
}

/* ---------- the soundtrack ---------- */
var A = { el: null, tr: null, cur: -1, active: 0, started: false, pend: false, blocked: false, up: false, was: false, at: 0, now: '' };
var D = { el: null };
var trP = null;
function tracks() {
  if (!trP) trP = getJSON('tracks').then(function (d) { A.tr = d.tracks; list(); var R = led().READY; if (R) R.album = true; return A.tr; }, function (e) {
    trP = null;
    var R = led().READY; if (R) R.album = false;
    each(doc.querySelectorAll('#album .lzfail'), function (p) { p.hidden = false; });
    throw e;
  });
  return trP;
}
function list() {
  var ol = $('#tracks'); if (!ol || ol.children.length) return;
  A.tr.forEach(function (t, k) {
    var li = mk('li', '', ol); li.id = 'trk-' + k; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', 'false');
    [['tn', pad2(k + 1)], ['tt', t.t], ['tk', t.k], ['tb', t.bpm + ' bpm']].forEach(function (p) { mk('span', p[0], li).textContent = p[1]; });
    li.addEventListener('click', function () { A.active = k; act(); go(k, 0, true); });
  });
  ol.removeAttribute('aria-busy');
  act(); sync();
}
function act() {
  var ol = $('#tracks'); if (!ol || !A.tr) return;
  each(ol.children, function (li, k) { li.classList.toggle('active', k === A.active && ol === doc.activeElement); });
  ol.setAttribute('aria-activedescendant', 'trk-' + A.active);
}
function el() {
  if (A.el) return A.el;
  var a = new Audio(); a.preload = 'auto';
  a.addEventListener('ended', function () { if (A.cur + 1 < A.tr.length) go(A.cur + 1, 0, false); else { A.cur = -1; save(); sync(); } });
  a.addEventListener('timeupdate', prog);
  ['play', 'pause', 'volumechange'].forEach(function (t) { a.addEventListener(t, sync); });
  a.addEventListener('playing', function () { A.blocked = false; dock(); sync(); });
  a.addEventListener('error', function () { if (A.cur >= 0 && a.getAttribute('src')) say('this track did not load. tap it to try again.'); });
  return (A.el = a);
}
/* from where this visit left it (sessionStorage), else track 1 */
function begin(user) {
  var s = ssGet(), k = s.k >= 0 ? s.k : 0, t = s.k >= 0 && Date.now() - (+s.at || 0) < 180000 ? +s.t || 0 : 0, a = el();
  A.started = true;
  if (A.tr) { go(Math.min(k, A.tr.length - 1), t, user); return; }
  A.pend = true;
  /* webkit: a load() inside the press marks this element as started by a person, so the play after the fetch is allowed */
  if (!a.getAttribute('src')) try { a.load(); } catch (e) { /* nothing to load yet */ }
  tracks().then(function () { if (A.pend) go(Math.min(k, A.tr.length - 1), t, user); }, function () { A.pend = false; A.started = false; sync(); });
}
function go(k, t, user) {
  var a = el(), src = BED + A.tr[k].f + '.mp3';
  A.started = true; A.pend = false; A.cur = k;
  if (user) { A.up = false; if (a.muted) a.muted = false; lsSet('on'); } /* any play press of the visitor's writes on */
  hush();
  if (a.getAttribute('src') !== src) a.src = src; else if (!t) try { a.currentTime = 0; } catch (e) { /* not seekable yet */ }
  if (t > 0) seek(a, t);
  start(a); save(); sync();
}
function seek(a, t) {
  if (a.readyState >= 1) { try { a.currentTime = t; } catch (e) { /* see go */ } return; }
  a.addEventListener('loadedmetadata', function f() { a.removeEventListener('loadedmetadata', f); try { if (t < a.duration - 1) a.currentTime = t; } catch (e) { /* see go */ } });
}
function start(a) {
  var p; try { p = a.play(); } catch (e) { p = null; }
  if (p && p.catch) p.catch(function (e) { if (e && e.name === 'NotAllowedError') A.blocked = true; sync(); });
}
function toggle() {
  var a = A.el;
  if (!a || A.cur < 0) { if (!A.pend) begin(true); return; }
  if (a.paused) { A.up = false; if (a.muted) a.muted = false; lsSet('on'); hush(); start(a); }
  else { A.up = true; a.pause(); }
  save();
}
function save() { var a = A.el; if (a) ssSet({ at: Date.now(), k: A.cur, t: A.cur >= 0 ? Math.floor(a.currentTime || 0) : 0, p: A.up ? 1 : 0 }); }
function prog() {
  var a = A.el, w = (a.duration ? 100 * a.currentTime / a.duration : 0).toFixed(2) + '%', g = $('#prog'), n = Date.now();
  if (g) g.style.width = w;
  if (D.bar) D.bar.style.width = w;
  if (n - A.at > 2000) { A.at = n; save(); }
}
/* #now is a live region: written only when its words change */
function say(pre, title, post) {
  var n = $('#now'), k = pre + '|' + (title || '') + '|' + (post || '');
  if (!n || A.now === k) return; A.now = k;
  n.textContent = pre;
  if (title) { mk('b', '', n).textContent = title; n.appendChild(doc.createTextNode(post)); }
}
function sync() {
  var a = A.el, on = !!a && !a.paused && A.cur >= 0, t = A.tr && A.cur >= 0 ? A.tr[A.cur] : null, b = $('#b-play'), ol = $('#tracks');
  if (b) lbl(b, on ? PAUSE : PLAY, on ? 'pause' : t ? 'play' : 'play the album');
  if (t) say(on ? 'now playing: ' : 'paused: ', pad2(A.cur + 1) + ' ' + t.t, ' · ' + t.k + ' · ' + t.bpm + ' bpm');
  else if (a) { say('nothing is playing.'); if ($('#prog')) $('#prog').style.width = '0'; }
  if (ol && A.tr) each(ol.children, function (li, k) { li.classList.toggle('cur', k === A.cur); li.setAttribute('aria-selected', k === A.cur ? 'true' : 'false'); });
  if (D.el) {
    lbl(D.play, on ? PAUSE : PLAY, on ? 'pause' : 'play');
    D.mute.textContent = (a ? a.muted : lsGet() === 'off') ? 'unmute' : 'mute';
    D.t.textContent = t ? 'my soundtrack · ' + pad2(A.cur + 1) + ' ' + t.t : 'my soundtrack';
  }
}
/* the dock: shown once the soundtrack has played; lane F1 mounts #player-dock, or it is made here */
function dock() {
  if (D.el) return;
  var d = $('#player-dock');
  if (!d) { d = mk('div', '', doc.body); d.id = 'player-dock'; }
  d.textContent = ''; d.setAttribute('role', 'region'); d.setAttribute('aria-label', 'the soundtrack');
  D.bar = mk('i', 'pd-bar', d); D.bar.setAttribute('aria-hidden', 'true');
  D.t = mk('p', 'pd-t', d);
  D.play = mk('button', 'pd-b', d); D.play.type = 'button'; D.play.addEventListener('click', toggle);
  D.next = mk('button', 'pd-b', d); D.next.type = 'button'; D.next.textContent = 'next'; D.next.setAttribute('aria-label', 'next song');
  D.next.addEventListener('click', function () { if (A.tr && A.cur >= 0) go((A.cur + 1) % A.tr.length, 0, true); else begin(true); });
  D.mute = mk('button', 'pd-b', d); D.mute.type = 'button';
  D.mute.addEventListener('click', function () { var a = A.el; if (!a) { lsSet('on'); begin(true); return; } a.muted = !a.muted; lsSet(a.muted ? 'off' : 'on'); sync(); });
  D.el = d; d.hidden = false; html.classList.add('sm-dock');
}
/* the first press anywhere. touch counts on the lift (a touchstart is no press to ios), a mouse on the press, keys but the
   ones that only move focus or modify */
var NOKEY = /^(Tab|Shift|Control|Alt|Meta|Escape|CapsLock|ContextMenu|Fn|OS|Unidentified|F\d{1,2})$/;
function press(e) {
  if (!e.isTrusted) return;
  var y = e.type, t = e.target;
  if (y === 'pointerdown' ? e.pointerType !== 'mouse' || e.button !== 0 : y === 'pointerup' ? e.pointerType === 'mouse' : y === 'keydown' && (NOKEY.test(e.key || '') || e.ctrlKey || e.metaKey || e.altKey)) return;
  if (t && t.closest) {
    var l = t.closest('a[href]');
    if (l && (l.getAttribute('href') || '').charAt(0) !== '#') return; /* a link that leaves: leave in silence */
    if (t.closest('.hear, .hcard, #tracks, #b-play, #player-dock')) return;
  }
  if (A.blocked && A.cur >= 0 && !A.up) { A.blocked = false; start(A.el); return; }
  if (A.started || S.playing || lite || lsGet() === 'off' || ssGet().p) return;
  begin(false);
}
['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(function (y) { addEventListener(y, press, { capture: true, passive: true }); });
addEventListener('pagehide', function () { A.was = !!A.el && !A.el.paused; save(); });
addEventListener('pageshow', function (e) { if (!e.persisted) return; if (A.was && !A.up) A.started = false; sync(); });

/* ---------- spotify ---------- */
var S = { api: null, apiP: null, ctl: null, row: null, making: null, chip: null, tid: '', loaded: '', want: false, playing: false, heard: false, ended: false, stuck: false, held: false, gen: 0, to: 0 };
var CH = [];
function api() {
  if (S.api) return Promise.resolve(S.api);
  if (!S.apiP) S.apiP = new Promise(function (res, rej) {
    var prev = window.onSpotifyIframeApiReady, to = setTimeout(function () { rej(new Error('timeout')); }, 15000);
    window.onSpotifyIframeApiReady = function (IF) { clearTimeout(to); S.api = IF; if (prev) try { prev(IF); } catch (e) { /* not ours */ } res(IF); };
    var s = mk('script', '', null); s.src = API; s.async = true;
    s.onerror = function () { clearTimeout(to); rej(new Error('script')); };
    doc.head.appendChild(s);
  }).catch(function (e) { S.apiP = null; throw e; });
  return S.apiP;
}
/* spotify's controller methods return nothing and can throw inside its own frame */
function cmd(m) { var c = S.ctl; if (!c) return; try { var r = (typeof c[m] === 'function' ? c[m] : c.play).call(c); if (r && r.catch) r.catch(function () {}); } catch (e) { /* see above */ } }
function holdAlbum() { var a = A.el; if (a && !a.paused) { a.pause(); S.held = true; } }
function release() { if (!S.held) return; S.held = false; var a = A.el; if (a && a.paused && A.cur >= 0 && !A.up) start(a); }
function hush() { if (S.ctl && (S.playing || S.want)) { S.want = false; cmd('pause'); } S.held = false; }
function stopHere() { S.want = false; cmd('pause'); if (!S.heard) release(); }
function paint(c) {
  var mine = S.chip === c && S.tid === c.tid, on = mine && S.playing, wait = mine && S.want && !on && !S.stuck;
  /* R21 DA: on webkit, once the page's own play is refused, the chip says where the one press goes */
  var hand = mine && WK && S.stuck && S.want;
  lbl(c.b, on || wait ? PAUSE : PLAY, hand ? 'press ▶︎ in the player' : (on ? 'pause' : wait ? 'loading' : c.verb) + (c.tail ? ': ' + c.tail : ''));
}
function paintAll() { CH.forEach(paint); }
function row(parent, cls) {
  var R = { el: mk('div', 'hrow ' + cls, parent) }, n;
  R.chips = mk('div', 'hchips', R.el);
  R.card = mk('div', 'hcard', R.el); R.card.hidden = true;
  R.slot = mk('div', 'hslot', R.card);
  n = mk('p', 'hnote', R.card);
  R.link = mk('a', '', n); R.link.target = '_blank'; R.link.rel = 'noopener'; R.link.textContent = 'full song on Spotify';
  R.why = mk('span', 'hwhy', n);
  return R;
}
function chip(R, cls, verb, tail, tid) {
  var c = { b: mk('button', 'hear ' + cls, R.chips), row: R, verb: verb, tail: tail, tid: tid };
  c.b.type = 'button';
  c.b.addEventListener('click', function () { hear(c); });
  CH.push(c); paint(c);
  return c;
}
function hear(c) {
  var R = c.row, tid = c.tid;
  if (!tid) return;
  if (S.chip === c && S.tid === tid && S.row === R) {
    if (S.playing || (S.want && !S.stuck)) stopHere();
    else { S.want = true; S.stuck = false; cmd(S.ended ? 'restart' : S.heard ? 'resume' : 'play'); if (!WK) holdAlbum(); /* webkit refuses the page's own play: the album plays on until the clip reports sound (upd) */ }
    paintAll(); return;
  }
  if (S.row && S.row !== R) drop();
  S.chip = c; S.tid = tid; S.row = R; S.want = true; S.heard = S.ended = S.stuck = S.playing = false;
  R.card.hidden = false; R.slot.hidden = false; R.link.href = TRACK + tid; R.why.textContent = COPY.why;
  if (!WK) holdAlbum(); /* webkit refuses the page's own play: the album plays on until the clip reports sound (upd) */
  paintAll();
  try { R.card.scrollIntoView({ block: 'nearest' }); } catch (e) { /* old engines */ }
  clearTimeout(S.to); S.to = setTimeout(slow, 15000);
  api().then(function (IF) {
    if (S.tid !== tid || S.row !== R) return;
    if (S.ctl) { if (S.loaded !== tid) { S.loaded = tid; try { S.ctl.loadUri('spotify:track:' + tid); } catch (e) { /* see cmd */ } } cmd('play'); return; }
    if (S.making !== R) make(IF, R);
  }, function () { if (S.tid === tid) fail(R, COPY.dead); });
}
function make(IF, R) {
  var g = ++S.gen, host = mk('div', '', null);
  R.slot.textContent = ''; R.slot.appendChild(host);
  S.making = R; S.loaded = S.tid;
  try {
    IF.createController(host, { uri: 'spotify:track:' + S.tid, width: '100%', height: 80, theme: 'dark' }, function (ctl) {
      if (g !== S.gen) { try { ctl.destroy(); } catch (e) { /* gone */ } return; }
      S.making = null; S.ctl = ctl;
      var fr = R.slot.querySelector('iframe'); if (fr && !fr.title) fr.title = 'spotify player';
      /* loadUri reloads the frame, and every reload says ready again */
      ctl.addListener('ready', function () {
        if (S.ctl !== ctl) return;
        if (S.loaded !== S.tid) { S.loaded = S.tid; try { ctl.loadUri('spotify:track:' + S.tid); } catch (e) { /* see cmd */ } return; }
        if (!S.want) return;
        cmd('play');
        if (WK) setTimeout(function () { if (S.ctl === ctl && S.want && !S.playing) { S.stuck = true; R.why.textContent = COPY.tap; paintAll(); } }, 1500);
      });
      ctl.addListener('playback_update', function (e) { if (S.ctl === ctl) upd(e && e.data); });
      ctl.addListener('error', function () { if (S.ctl === ctl) fail(R, COPY.gone); });
    });
  } catch (e) { S.making = null; fail(R, COPY.dead); }
}
/* one report from the embed: {isPaused, isBuffering, position, duration} in ms. on webkit a play the page asked for blinks
   unpaused at 0 without sound, so there only a position past 0 is a start */
function upd(d) {
  if (!d) return;
  var dur = +d.duration || 0, pos = +d.position || 0, end = dur > 0 && pos >= dur - 300;
  var run = !d.isPaused && !end && (pos > 0 || (!WK && (!d.isBuffering || S.heard)));
  if (end) S.ended = true; else if (run) S.ended = false;
  S.playing = run;
  if (run) { S.heard = true; S.stuck = false; clearTimeout(S.to); if (S.row) S.row.why.textContent = COPY.why; holdAlbum(); }
  else if (S.heard && (d.isPaused || end)) { S.want = false; release(); }
  paintAll();
}
function slow() { if (S.playing || S.heard) return; S.stuck = true; if (!WK) release(); /* webkit: the album stays held while the player waits for its one press */ if (S.row && WK) S.row.why.textContent = COPY.tap; paintAll(); }
function fail(R, msg) {
  clearTimeout(S.to); S.want = S.playing = false; S.stuck = true; release();
  R.card.hidden = false; R.why.textContent = msg; if (!S.ctl) R.slot.hidden = true;
  paintAll();
}
function drop() {
  S.gen++; S.making = null;
  if (S.ctl) try { S.ctl.destroy(); } catch (e) { /* gone */ }
  S.ctl = null; S.loaded = ''; S.playing = false;
  if (S.row) { S.row.card.hidden = true; S.row.slot.textContent = ''; }
  S.row = null;
}
/* the taste card: its own chip, neutral (a color would give the answer away), for the card on screen */
function tasteRow() {
  var card = $('#card'); if (!card) return;
  var R = row(card, 'h-taste'), c = chip(R, 'h-it', 'hear it', '', ''), g = $('#game'), t = $('#c-t');
  R.el.setAttribute('aria-live', 'off'); R.el.hidden = true;
  var now = function () {
    var T = led().TS, r = T && T.deck && T.deck[T.i], u = (r && r.u) || '';
    if (u === c.tid) return;
    if (S.row === R) { if (S.playing || S.want) stopHere(); R.card.hidden = true; }
    c.tid = u; R.el.hidden = !u; paint(c);
  };
  if (window.MutationObserver) {
    if (t) new MutationObserver(now).observe(t, { childList: true, characterData: true, subtree: true });
    if (g) new MutationObserver(function () { if (g.hidden && S.row === R && (S.playing || S.want)) stopHere(); }).observe(g, { attributes: true, attributeFilter: ['hidden'] });
  }
  now();
}
/* the genre chips: their data waits for the first scroll (nothing past the first screen's own loads before one) */
var hearP = null;
function genreRow() {
  if (hearP) return;
  hearP = getJSON('hear').then(function (h) {
    var host = $('[data-hear="genre"]') || $('#genre .g-chart') || $('#genre'); if (!host || !h.tap || !h.queue) return;
    var R = row(host, 'h-genre');
    chip(R, 'h-me', 'hear one i pressed play on', h.tap.t + ', ' + h.tap.a, h.tap.u);
    chip(R, 'h-q', 'hear one the queue served', h.queue.t + ', ' + h.queue.a, h.queue.u);
  }, function () { hearP = null; });
}

/* ---------- boot ---------- */
var css = mk('style', '', doc.head); css.id = 'sm-music-css';
css.textContent = [
  /* R21 merge 2026-10-17: lane F1 ships the mount in the page, so the empty dock must not paint before the first play */
  '#player-dock:empty{display:none}',
  '#player-dock{position:fixed;z-index:40;left:0;right:0;bottom:0;display:flex;align-items:center;height:calc(44px + env(safe-area-inset-bottom));padding:0 0 env(safe-area-inset-bottom) max(14px,env(safe-area-inset-left));background:var(--bg);border-top:1px solid var(--hair);color:var(--ink);font:500 13px/1.2 var(--mono)}',
  '#player-dock .pd-bar{position:absolute;left:0;top:0;height:2px;width:0;background:var(--ice)}',
  '#player-dock .pd-t{flex:1 1 auto;min-width:0;margin:0 10px 0 0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',
  '#player-dock .pd-b{appearance:none;-webkit-appearance:none;flex:0 0 auto;height:44px;min-width:78px;margin:0;padding:0 14px;border:0;border-left:1px solid var(--faint);background:transparent;color:var(--ink);font:600 13px/1 var(--mono);cursor:pointer;-webkit-tap-highlight-color:transparent}',
  '#player-dock .pd-b:hover{background:var(--card)}',
  '#player-dock .pd-b:focus-visible{outline:2px solid var(--ice);outline-offset:-3px}',
  'html.sm-dock body{padding-bottom:calc(44px + env(safe-area-inset-bottom))}',
  'html.sm-dock{scroll-padding-bottom:calc(56px + env(safe-area-inset-bottom))}',
  '@media (min-width:760px){#player-dock{left:auto;right:16px;bottom:16px;width:min(440px,calc(100vw - 32px));height:46px;padding:0 0 0 14px;border:1px solid var(--hair);border-radius:4px;box-shadow:0 10px 28px var(--shadow);overflow:hidden}html.sm-dock body{padding-bottom:78px}html.sm-dock{scroll-padding-bottom:86px}}',
  '.hrow{margin-top:16px;max-width:560px}',
  '.hchips{display:flex;flex-direction:column;align-items:flex-start;gap:8px}',
  '.hear{appearance:none;-webkit-appearance:none;display:inline-flex;align-items:center;gap:.45em;min-height:44px;max-width:100%;margin:0;padding:10px 14px;border:1px solid var(--hair);border-radius:3px;background:transparent;color:var(--ink);font:600 14px/1.3 var(--sans);text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}',
  '.hear:hover{border-color:var(--ink)}',
  '.hear.h-me{box-shadow:inset 3px 0 0 var(--mint)}.hear.h-q{box-shadow:inset 3px 0 0 var(--violet)}.hear.h-it{box-shadow:inset 3px 0 0 var(--ice)}',
  '.hcard{margin-top:10px;padding:8px 8px 2px;border:1px solid var(--hair);border-radius:4px;background:var(--card)}',
  '.hslot{min-height:80px}.hslot iframe{display:block;width:100%;height:80px;border:0;border-radius:3px}',
  '.hnote{margin-top:4px;font:500 12.5px/1.45 var(--mono);color:var(--mute)}',
  '.hnote a{display:inline-flex;align-items:center;min-height:30px;color:var(--ink);text-underline-offset:3px}@media (pointer:coarse){.hnote a{min-height:44px}}',
  '.hwhy{display:block;padding-bottom:6px}',
  '@media (forced-colors:active){#player-dock,.hear,.hcard{border:1px solid CanvasText}}'
].join('\n');
tasteRow();
var bp = $('#b-play'); if (bp) bp.addEventListener('click', toggle);
(function () {
  var ol = $('#tracks'); if (!ol) return;
  ol.addEventListener('focus', act); ol.addEventListener('blur', act);
  ol.addEventListener('keydown', function (e) {
    if (!A.tr) return;
    var k = e.key, a = A.active;
    if (k === 'ArrowDown') a++; else if (k === 'ArrowUp') a--; else if (k === 'Home') a = 0; else if (k === 'End') a = A.tr.length - 1;
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); go(A.active, 0, true); return; }
    else return;
    e.preventDefault(); A.active = Math.max(0, Math.min(A.tr.length - 1, a)); act();
    ol.children[A.active].scrollIntoView({ block: 'nearest' });
  });
})();
near('#album', '100% 0px 100% 0px', function () { tracks().catch(function () { /* the section shows its own line */ }); });
addEventListener('scroll', function f() { removeEventListener('scroll', f); genreRow(); }, { passive: true });
near('#genre', '0px', genreRow);
/* a stored mute ("off") shows the dock muted instead of hiding it, and hides the first-screen note that promises a start */
if (lsGet() === 'off' || lite) { var sn = $('#snd-note'); if (sn) sn.hidden = true; }
if (lsGet() === 'off') { dock(); sync(); }
window.__smMusic = { A: A, S: S, D: D, go: function (k) { go(k, 0, true); } };
})();
