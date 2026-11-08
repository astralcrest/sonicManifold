/* sonicManifold service worker — instant repeat visits.
   HTML: network-first (updates always land), cache fallback (offline/slow).
   figdata/images/json: stale-while-revalidate (instant, refreshes in background).
   Audio is deliberately NOT handled: <audio> uses Range requests (206) which
   the Cache API can't store; the browser HTTP cache handles those fine. */
/* bumped with every exhibit build whose modules changed (2026-09-28 atlas round 3, modules at ?v=20260929r5, 2026-09-29 V4 fixes; 2026-10-01 round 5 at ?v=20261001r1; 2026-10-02 round 5 pass 2 at ?v=20261001r2; 2026-10-03 round 5 wave 3 at ?v=20261005r6: predict, postcards, field listens, reorder): activate drops every older cache, so a
   returning visitor never runs one version's module next to another's. nothing is precached: the Tier-B universe files
   (the per-day records, the full roster, the tracks) are never named here. the round-5 pass-2 stops and angles (rooms/bail,
   loop, arrivals, wheel, fade, gates, map.ghost .js; data/bail, loops, arrivals, wheel_agg, whopressed2, bi_conditions, gates,
   ghost .json) are cached on first use by the .js/.json stale-while-revalidate rule below, under the new VERSION */
var VERSION = 'sm-v91';
/* show-night walls: small pages, scripts and data warmed at install. pv.json (353 KB) and all audio stay out: first tap only. */
var WALLS = ['/editions/loop/', '/editions/loop/index.html', '/editions/loop/loop.js', '/editions/loop/data/loop.json', '/editions/loop/data/fit.json',
  '/editions/two/', '/editions/two/index.html', '/editions/two/two.js', '/editions/two/data/samples.json', '/editions/two/data/qr.svg',
  '/editions/yours/', '/editions/yours/index.html', '/editions/yours/yours.js', '/editions/loop/room.html', '/editions/loop/data/qr_loop.svg', '/editions/taste/', '/editions/taste/index.html', '/editions/taste/taste.js', '/editions/taste/pairs.json', '/editions/kiosk.js', '/editions/wallkit.js', '/editions/wall.css', '/editions/walls/', '/editions/walls/index.html', '/editions/seeds/', '/editions/seeds/index.html', '/editions/seeds/seeds.js', '/editions/undo/', '/editions/undo/index.html', '/editions/undo/undo.js', '/editions/blind/', '/editions/blind/index.html', '/editions/blind/blind.js', '/editions/booth/', '/editions/booth/index.html', '/editions/booth/booth.js', '/editions/booth/claims.json', '/editions/slow/', '/editions/slow/index.html', '/editions/slow/slow.js', '/editions/haunted/', '/editions/haunted/index.html', '/editions/haunted/haunted.js', '/editions/haunted/data/map.json', '/editions/haunted/data/haunted.json', '/editions/receipt.js', '/editions/tug/', '/editions/tug/index.html', '/editions/tug/tug.js', '/editions/telephone/', '/editions/telephone/index.html', '/editions/telephone/telephone.js', '/editions/stutter/', '/editions/stutter/index.html', '/editions/stutter/stutter.js', '/editions/meet/', '/editions/meet/index.html', '/editions/meet/meet.js', '/editions/hold/', '/editions/hold/index.html', '/editions/hold/hold.js', '/editions/shake/', '/editions/shake/index.html', '/editions/shake/shake.js', '/editions/pour/', '/editions/pour/index.html', '/editions/pour/pour.js', '/editions/applause/', '/editions/applause/index.html', '/editions/applause/applause.js', '/editions/way/', '/editions/way/index.html', '/editions/way/way.js', '/editions/stand/', '/editions/stand/index.html', '/editions/stand/stand.js', '/editions/scrub/', '/editions/scrub/index.html', '/editions/scrub/scrub.js', '/editions/longhold/', '/editions/longhold/index.html', '/editions/longhold/longhold.js', '/editions/chorus/', '/editions/chorus/index.html', '/editions/chorus/chorus.js', '/editions/walls/chorus.jpg', '/editions/print/', '/editions/print/index.html', '/editions/print/print.css', '/editions/print/print.js', '/editions/print/stub.html', '/editions/print/chorus.html', '/editions/print/taste.html', '/editions/print/mirror.html', '/editions/print/receipt2.html', '/editions/show/', '/editions/show/index.html', '/editions/show/show.js', '/editions/show/wall_loop_poster.jpg', '/editions/show/img/cube_corner.jpg', '/editions/show/img/cube_plan.jpg', '/editions/show/img/diptych.jpg', '/editions/show/img/facet4_rooms.jpg', '/editions/show/img/facet5_maps.jpg', '/editions/show/img/facet7_ring.jpg', '/editions/show/img/loop_fig.jpg', '/editions/show/img/loop_walls.jpg', '/editions/show/img/record_still.jpg', '/editions/show/img/record_wall.jpg', '/editions/show/img/ring_and_count.jpg', '/editions/show/img/sleeve_mock.jpg', '/editions/show/img/small_wall_1.jpg', '/editions/show/img/small_wall_2.jpg', '/editions/show/img/small_wall_3.jpg', '/editions/show/img/small_wall_4.jpg', '/editions/show/img/small_wall_5.jpg', '/editions/show/img/small_wall_6.jpg', '/editions/show/img/small_wall_7.jpg', '/editions/show/img/small_wall_8.jpg', '/editions/show/img/stickers.jpg', '/editions/show/img/th3_chorus.jpg', '/editions/show/img/th3_receipt.jpg', '/editions/show/img/th3_sleeve_back.jpg', '/editions/show/img/th3_sleeve_front.jpg', '/editions/show/img/th3_split_stub.jpg', '/editions/show/img/th3_sticker_sheet.jpg', '/editions/show/img/th3_taste.jpg',
  '/front/data/field.json', '/front/data/maps.json'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then(function (c) {
    /* the site lives under /sonicManifold/ on Pages: resolve every warm path against the worker's own directory, never the domain root */
    var base = new URL('./', self.location.href).href;
    return Promise.all(WALLS.map(function (u) { return c.add(new URL(u.replace(/^\//, ''), base).href).catch(function () {}); }));
  }));
});

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
    // the page's module retry asks for X.js?v=..&retry=N so the browser forgets a failed url; the cache keeps ONE entry per module
    var key = req;
    if (/[?&]retry=\d/.test(url.search)) { url.search = url.search.replace(/([?&])retry=\d+&?/, '$1').replace(/[?&]$/, ''); key = url.href; }
    e.respondWith(
      caches.open(VERSION).then(function (c) {
        return c.match(key).then(function (hit) {
          var net = fetch(req).then(function (r) {
            if (r && r.status === 200) c.put(key, r.clone());
            return r;
          }).catch(function () { return hit; });
          return hit || net;
        });
      })
    );
  }
});
