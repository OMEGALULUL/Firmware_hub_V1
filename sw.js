// sw.js - Service Worker for M5Stick Firmware Hub
const CACHE_NAME = 'm5-firmware-hub-v2';
//Change Version for new updates
// List of core assets to cache (add your local esptool-js files if offline)
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/app.js',
  '/js/esptool/lib/index.js',
  '/js/esptool/lib/esptool.js'
  // Add any other local files (CSS, icons, etc.)
];

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
