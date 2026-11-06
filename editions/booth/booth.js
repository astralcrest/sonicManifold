(function () {
'use strict';
var $ = function (id) { return document.getElementById(id); };
var claims = [], order = [], pos = -1, shown = [], timers = [], idle = 0, voiceOn = false;
var synth = window.speechSynthesis, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
var go = $('go'), claimEl = $('claim'), refEl = $('ref'), reft = $('reft'), row = $('row'), cnt = $('cnt'), room = $('room'), voice = $('voice');

function shuffle() {
  order = claims.map(function (_, i) { return i; });
  for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
  pos = -1; shown = [];
}
function clear() { timers.forEach(clearTimeout); timers = []; if (synth) synth.cancel(); }
function draw(cur) {
  row.innerHTML = '';
  claims.forEach(function (_, i) { var s = document.createElement('i'); if (i === cur) s.className = 'now'; else if (shown.indexOf(i) >= 0) s.className = 'dead'; row.appendChild(s); });
  cnt.textContent = claims.length;
}
function type(el, text, speed, done) {
  if (reduce) { el.textContent = text; done && done(); return; }
  var n = 0;
  (function step() { n++; el.textContent = text.slice(0, n); if (n < text.length) timers.push(setTimeout(step, speed)); else done && done(); })();
}
function say(txt) {
  if (!synth || !(window.WK && WK.sound())) return;
  synth.cancel(); var u = new SpeechSynthesisUtterance(txt); u.rate = .95; synth.speak(u);
}
function bump() { clearTimeout(idle); idle = setTimeout(reset, 120000); }
function confess() {
  bump(); clear();
  if (pos + 1 >= order.length) shuffle();
  pos++; var i = order[pos], c = claims[i];
  shown.push(i); draw(i);
  room.dataset.lit = String(Math.min(3, 1 + Math.floor(shown.length / 6)));
  claimEl.textContent = ''; reft.textContent = ''; refEl.classList.remove('on');
  type(claimEl, c.claim, 28, function () {
    timers.push(setTimeout(function () {
      refEl.classList.add('on');
      type(reft, c.referee, 14, function () { say(c.claim + ' ... ' + c.referee); });
    }, reduce ? 0 : 900));
  });
}
function reset() {
  clear(); shuffle(); claimEl.textContent = ''; reft.textContent = ''; refEl.classList.remove('on');
  room.dataset.lit = '0'; draw(-1); go.textContent = 'confess'; clearTimeout(idle);
}
go.addEventListener('click', function () { confess(); go.textContent = 'confess again'; });
$('reset').addEventListener('click', reset);
if (!synth || typeof SpeechSynthesisUtterance === 'undefined') { synth = null; voice.hidden = true; }
voice.addEventListener('click', function () {
  voiceOn = !voiceOn; voice.setAttribute('aria-pressed', voiceOn); voice.textContent = voiceOn ? 'voice on' : 'voice off';
  if (!voiceOn && synth) synth.cancel();
});
fetch('claims.json').then(function (r) { return r.json(); }).then(function (d) { claims = d.claims; reset(); });
})();
