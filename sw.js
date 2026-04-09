//remember the VERSION TO UPDATE TEXT PLSSSS
const CACHE_NAME = 'm5-firmware-hub-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/app.js',
  // Add the full path to the esptool-js library on the CDN
  'https://unpkg.com/esptool-js@0.4.0/lib/index.js'
];

// The rest of your service worker logic remains unchanged
self.addEventListener('install', event => {
  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

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
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
