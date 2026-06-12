// sw.js — network-first service worker with cache fallback.
// Fresh files win during development; the cache makes the app work offline
// after the first complete visit. Flags are precached at install (every
// other file the app needs is fetched on first visit anyway, but a flag is
// only requested when its region's card renders — without precaching, a
// never-seen flag breaks offline).

const CACHE_NAME = "atlas-cache-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    Promise.all([caches.open(CACHE_NAME), fetch("data/regions.json").then((res) => res.json())])
      .then(([cache, regions]) => {
        const flagUrls = [...new Set(
          regions
            .filter((region) => region.iso2)
            .map((region) => `vendor/flags/${region.iso2.toLowerCase()}.svg`)
        )];
        // Per-file catch: one missing flag shouldn't abort the whole install
        return Promise.all(flagUrls.map((url) => cache.add(url).catch(() => {})));
      })
      .catch(() => {}) // offline install: skip precache, runtime caching still works
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          const responseCopy = networkResponse.clone();
          // waitUntil keeps the worker alive until the cache write finishes
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy)));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(event.request).then(
          (cachedResponse) =>
            cachedResponse ||
            new Response("Offline and not yet cached", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
        )
      )
  );
});
