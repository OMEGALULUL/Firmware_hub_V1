const CACHE_NAME = 'm5-firmware-hub-v1';
// When updating Hub make sure to change cache name from V69 to V70 (jk)
// List of core assets to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://bruce.computer/flasher',
  'https://atomnft.github.io/M5stick-Marauder/flash0.html',
  'https://infiltra.xyz',
  'https://bmorcelli.github.io/M5Stick-Launcher/flash0.html'
];

// Install event: cache core assets
self.addEventListener('install', event => {
  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  // Force the waiting service worker to become active
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating.');
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  // Take control of all clients immediately
  return self.clients.claim();
});

// Fetch event: serve from cache, fallback to network, then update cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return cached version immediately if available
      if (cachedResponse) {
        // In background, fetch network version and update cache
        event.waitUntil(
          fetch(event.request).then(networkResponse => {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          }).catch(() => {
            // Network request failed, just keep cached version
          })
        );
        return cachedResponse;
      }
      // No cache, fetch from network
      return fetch(event.request).then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});
