// Service Worker for offline caching and performance
const CACHE_NAME = 'kalshi-predictor-v1';
const RUNTIME_CACHE = 'kalshi-runtime-v1';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/assets/index.css',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests (always fetch fresh data)
  if (event.request.url.includes('/api/')) {
    return;
  }

  // For static assets, try cache first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Fetch from network and cache for future use
      return fetch(event.request).then((response) => {
        // Don't cache if not a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response for caching
        const responseToCache = response.clone();

        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});




