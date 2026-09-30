// Minimal service worker for Relocation Reference (movein.website).
// Its only real job here is to satisfy the browser's PWA "installability" checklist (Chrome/Edge
// require an active service worker with a fetch handler before they'll offer the native install
// prompt). It also gives a basic offline fallback for the app shell, but deliberately uses a
// network-first strategy for the page itself so a returning visitor always gets your latest
// deployed changes when they're online — the cache is only a safety net for when they're not.

const CACHE_NAME = 'movein-shell-v1';
const APP_SHELL = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // don't fail install if a shell URL 404s in some environment
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Network-first for navigations (the page itself) — always fetch the latest version when
  // online, fall back to the cached shell only when the network is unavailable.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for everything else (icons, manifest, etc.) with a network fallback.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => cached))
  );
});
