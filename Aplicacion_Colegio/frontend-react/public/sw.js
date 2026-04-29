// ──────────────────────────────────────────────
// Colegio SaaS — Service Worker
// Strategy: network-first for navigations, stale-while-revalidate for assets.
// Automatic version detection & update notification.
// Bump CACHE_VERSION on each deploy to force old cache eviction.
// ──────────────────────────────────────────────

// Generate a unique version hash from the current timestamp
const BUILD_VERSION = new Date().toISOString().split('T')[0];
const CACHE_VERSION = 3;
const CACHE_NAME = `colegio-saas-v${CACHE_VERSION}`;
const VERSION_KEY = 'sw-version';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
];

// ── Install ──────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      cache.addAll(CORE_ASSETS);
      // Store current version
      return cache.put(VERSION_KEY, new Response(BUILD_VERSION));
    })
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log(`[SW] Deleting old cache: ${key}`);
            return caches.delete(key);
          }
          return null;
        })
      )
    ).then(() => {
      // Notify all clients that a new version is available
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_UPDATE_AVAILABLE',
            version: BUILD_VERSION,
          });
        });
      });
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ── Strategies ───────────────────────────────

/** Network-first: try network, fall back to cache, then offline shell. */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || caches.match('/index.html');
  }
}

/** Stale-while-revalidate: serve cached, update in background. */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkPromise = fetch(request).then((response) => {
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // Return cached immediately if available, otherwise wait for network
  return cached || networkPromise;
}

// ── Fetch handler ────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin and API requests
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigations → network-first (always get latest HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Static assets (JS, CSS, images) → stale-while-revalidate
  event.respondWith(staleWhileRevalidate(event.request));
});

// ── Update broadcast ─────────────────────────
// When a new version activates, tell all clients to reload
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
