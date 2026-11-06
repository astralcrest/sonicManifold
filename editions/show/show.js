(function () {
  var rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vs = [].slice.call(document.querySelectorAll('video'));
  var wl = document.getElementById('wl'), pb = document.getElementById('wl-play'), fs = document.getElementById('wl-fs');
  var userPaused = rm;
  function go(v) { if (v.preload !== 'auto') v.preload = 'auto'; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { if (!(v === wl && userPaused) && !rm) go(v); }
        else v.pause();
      });
    }, { rootMargin: '120px', threshold: 0.15 });
    vs.forEach(function (v) { io.observe(v); });
  } else if (!rm) { vs.forEach(go); }
  function label() { if (pb) { pb.textContent = userPaused ? 'play' : 'pause'; pb.setAttribute('aria-pressed', String(!userPaused)); } }
  label();
  if (pb && wl) pb.addEventListener('click', function () { userPaused = !userPaused; if (userPaused) wl.pause(); else go(wl); label(); });
  if (fs && wl) {
    var can = wl.requestFullscreen || wl.webkitRequestFullscreen || wl.webkitEnterFullscreen;
    if (!can) fs.hidden = true;
    fs.addEventListener('click', function () {
      if (!userPaused) go(wl);
      if (wl.requestFullscreen) wl.requestFullscreen(); else if (wl.webkitRequestFullscreen) wl.webkitRequestFullscreen(); else if (wl.webkitEnterFullscreen) wl.webkitEnterFullscreen();
    });
  }
})();
