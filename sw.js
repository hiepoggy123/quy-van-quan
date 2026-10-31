// Service Worker for Quy Van Quan PWA (Offline Support)
const CACHE_NAME = 'quy-van-v4';
const ASSETS = [
  './',
  './index.html',
  './quy-van-deck.js',
  './quy-van-examples.js',
  './quy-van-phonetic.js',
  './quy-van-story.js',
  './quy-van-pairs.js',
  './quy-van-core.js',
  './quy-van-audio.js',
  './quy-van-world.js',
  './quy-van-app.js',
  './icon-192.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Let cross-origin requests (e.g. Google TTS, Google Fonts) pass through directly
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => cached);
    })
  );
});
