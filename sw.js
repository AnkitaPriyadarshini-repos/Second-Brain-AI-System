/* Second Brain AI System — Service Worker for Offline PWA Support */

const CACHE_NAME = 'second-brain-cache-v63.0';
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
  './js/utils.js?v=58.0',
  './js/production-chat.js?v=5.0',
  './assets/nexus_yellow_bot.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(cacheNames.map((cache) => cache !== CACHE_NAME ? caches.delete(cache) : undefined)))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // API calls must always reach the network; static assets use network-first
  // with a cache fallback so a new deployment is picked up immediately.
  if (new URL(event.request.url).pathname.startsWith('/api/')) return;
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
