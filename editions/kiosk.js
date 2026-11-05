/* ?kiosk=1 only: reset to a fresh page after idle (default 120 s, ?idle=N seconds), register the cache worker for offline tablets. no storage, no state kept. */
(function () {
  var Q = new URLSearchParams(location.search);
  if (Q.get('kiosk') !== '1') return;
  var sec = parseInt(Q.get('idle'), 10);
  if (!(sec > 0)) sec = 120;
  var t;
  function arm() { clearTimeout(t); t = setTimeout(function () { location.replace(location.pathname + '?kiosk=1' + (Q.get('idle') ? '&idle=' + sec : '')); }, sec * 1000); }
  ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(function (e) { addEventListener(e, arm, { passive: true }); });
  arm();
  document.addEventListener('DOMContentLoaded', function () { var d = document.createElement('p'); d.textContent = 'resets after ' + (sec >= 120 && sec % 60 === 0 ? sec / 60 + ' min' : sec + ' s') + ' idle'; d.style.cssText = 'font:11px/1.4 "IBM Plex Mono",monospace;color:#8c82a8;margin:16px 16px 24px'; document.body.appendChild(d); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(function () {});
})();
