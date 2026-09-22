// Offline support. The app talks to no server and every built asset is
// content-hashed, so cached files never go stale: pages are fetched
// network-first (falling back to the cached shell), everything else
// cache-first. The browser re-checks this file on each visit, and a new
// CACHE name below drops the old store on activate.
//
// ponytail: superseded hashed assets stay cached until the name changes, and
// fonts referenced from inside the CSS are only cached once used, so a first
// open that is already offline renders with fallback fonts. Switch to
// vite-plugin-pwa (precache manifest) if either ever matters.
const CACHE = 'cashflow-timeline-v1';

/** The shell plus the script and stylesheet it links, so the first visit already works offline. */
async function precache() {
  const cache = await caches.open(CACHE);
  const shell = await fetch('./');
  const html = await shell.clone().text();
  const assets = [...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g)].map((m) => m[1]);
  await cache.put('./', shell);
  await cache.addAll(assets);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./', copy));
          return response;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
