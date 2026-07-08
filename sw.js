/* sonicManifold service worker — instant repeat visits.
   HTML: network-first (updates always land), cache fallback (offline/slow).
   figdata/images/json: stale-while-revalidate (instant, refreshes in background).
   Audio is deliberately NOT handled: <audio> uses Range requests (206) which
   the Cache API can't store; the browser HTTP cache handles those fine. */
var VERSION = 'sm-v1';

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
    e.respondWith(
      fetch(req).then(function (r) {
        if (r && r.status === 200) {
          var copy = r.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return r;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }

  // figdata / images / json / fonts: stale-while-revalidate
  if (/\.(json|png|webp|jpg|jpeg|svg|ico|woff2?)$/.test(url.pathname)) {
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
