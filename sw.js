/* sonicManifold service worker — instant repeat visits.
   HTML: network-first (updates always land), cache fallback (offline/slow).
   figdata/images/json: stale-while-revalidate (instant, refreshes in background).
   Audio is deliberately NOT handled: <audio> uses Range requests (206) which
   the Cache API can't store; the browser HTTP cache handles those fine. */
var VERSION = 'sm-v5';

self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.indexOf('/audio/') !== -1) return;           // Range requests
  if (/\.(mp3|mp4|gif)$/.test(url.pathname)) return;

  // navigations + .html: network-first
  if (req.mode === 'navigate' || /\.html$/.test(url.pathname) || url.pathname.endsWith('/')) {
    // network-first, but a returning visitor on a very slow link gets the cached page after 3.5s
    // without headers (fetch resolves at headers, so this only trips on a genuinely stalled network);
    // the network copy still lands in the cache for the next load.
    e.respondWith(new Promise(function (resolve) {
      var done = false;
      function finish(r) { if (!done) { done = true; resolve(r); } }
      var timer = setTimeout(function () {
        caches.match(req).then(function (hit) { if (hit) finish(hit); });
      }, 3500);
      fetch(req).then(function (r) {
        clearTimeout(timer);
        if (r && r.status === 200) {
          var copy = r.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        finish(r);
      }).catch(function () {
        clearTimeout(timer);
        caches.match(req).then(function (hit) { finish(hit || Response.error()); });
      });
    }));
    return;
  }

  // versioned immutable assets (the trimmed Plotly bundle): cache-first, no
  // background refetch — the filename carries the version and VERSION bumps
  // whenever the bundle changes, so revalidation is pure duplicate bandwidth.
  if (/plotly-sm-[\d.]+\.min\.js$/.test(url.pathname)) {
    e.respondWith(
      caches.open(VERSION).then(function (c) {
        return c.match(req).then(function (hit) {
          return hit || fetch(req).then(function (r) {
            if (r && r.status === 200) c.put(req, r.clone());
            return r;
          });
        });
      })
    );
    return;
  }

  // figdata / images / json / fonts: stale-while-revalidate
  if (/\.(json|js|png|webp|jpg|jpeg|svg|ico|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.open(VERSION).then(function (c) {
        return c.match(req).then(function (hit) {
          var net = fetch(req).then(function (r) {
            if (r && r.status === 200) c.put(req, r.clone());
            return r;
          }).catch(function () { return hit; });
          return hit || net;
        });
      })
    );
  }
});
