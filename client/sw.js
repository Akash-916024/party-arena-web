/**
 * Party Arena Web — Service Worker
 * Provides offline caching, instant app loading, and PWA capabilities.
 */

const CACHE_NAME = 'party-arena-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/qrious.min.js',
  './js/qrcode-helper.js',
  './js/audio.js',
  './js/network.js',
  './js/ui.js',
  './js/profile.js',
  './js/settings.js',
  './js/reactions.js',
  './js/chat.js',
  './js/public-rooms.js',
  './js/room.js',
  './js/tournament.js',
  './js/games/base-game.js',
  './js/games/pong.js',
  './js/games/tic-tac-toe.js',
  './js/games/reaction.js',
  './js/games/connect-four.js',
  './js/games/memory.js',
  './js/games/tug-of-war.js',
  './js/games/bomb-tag.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignore WebSocket and non-GET requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('ws')) {
    return;
  }

  // API calls are network-only
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
