/* Second Brain AI System — Service Worker for Offline PWA Support */

const CACHE_NAME = 'second-brain-cache-v35.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './css/responsive.css',
  './js/nlp-engine.js',
  './js/store.js',
  './js/rag-engine.js',
  './js/voice-engine.js',
  './js/audio-presets.js',
  './js/resurfacing-engine.js',
  './js/graph-visualizer.js',
  './js/ai-engine.js',
  './js/gemini-color-flow.js',
  './js/nexus-bot.js',
  './js/developer-hud.js',
  './js/sound-engine.js',
  './js/ai-agents.js',
  './js/app.js',
  './assets/nexus_yellow_bot.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old Service Worker cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first strategy: always fetch live code from server first, fallback to cache if offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});
