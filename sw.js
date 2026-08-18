/* Second Brain AI System — Service Worker for Offline PWA Support */

const CACHE_NAME = 'second-brain-cache-v52.0';
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
  './js/utils.js',
  './js/production-chat.js?v=1.0',
  './assets/nexus_yellow_bot.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.map((cache) => cache !== CACHE_NAME ? caches.delete(cache) : undefined)
    )).then(() => self.clients.claim())
  );
});

// Network-first: production code and AI UI updates should arrive immediately.
// Cache remains a fallback for offline use only.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
      }
      return networkResponse;
    }).catch(() => caches.match(event.request))
  );
});
