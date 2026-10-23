/* Second Brain AI System — Service Worker for Offline PWA Support */

const CACHE_NAME = 'second-brain-cache-v72.0';

const KATEX_FONTS = [
  './vendor/katex/fonts/KaTeX_AMS-Regular.ttf',
  './vendor/katex/fonts/KaTeX_AMS-Regular.woff',
  './vendor/katex/fonts/KaTeX_AMS-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Caligraphic-Bold.ttf',
  './vendor/katex/fonts/KaTeX_Caligraphic-Bold.woff',
  './vendor/katex/fonts/KaTeX_Caligraphic-Bold.woff2',
  './vendor/katex/fonts/KaTeX_Caligraphic-Regular.ttf',
  './vendor/katex/fonts/KaTeX_Caligraphic-Regular.woff',
  './vendor/katex/fonts/KaTeX_Caligraphic-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Fraktur-Bold.ttf',
  './vendor/katex/fonts/KaTeX_Fraktur-Bold.woff',
  './vendor/katex/fonts/KaTeX_Fraktur-Bold.woff2',
  './vendor/katex/fonts/KaTeX_Fraktur-Regular.ttf',
  './vendor/katex/fonts/KaTeX_Fraktur-Regular.woff',
  './vendor/katex/fonts/KaTeX_Fraktur-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Main-Bold.ttf',
  './vendor/katex/fonts/KaTeX_Main-Bold.woff',
  './vendor/katex/fonts/KaTeX_Main-Bold.woff2',
  './vendor/katex/fonts/KaTeX_Main-BoldItalic.ttf',
  './vendor/katex/fonts/KaTeX_Main-BoldItalic.woff',
  './vendor/katex/fonts/KaTeX_Main-BoldItalic.woff2',
  './vendor/katex/fonts/KaTeX_Main-Italic.ttf',
  './vendor/katex/fonts/KaTeX_Main-Italic.woff',
  './vendor/katex/fonts/KaTeX_Main-Italic.woff2',
  './vendor/katex/fonts/KaTeX_Main-Regular.ttf',
  './vendor/katex/fonts/KaTeX_Main-Regular.woff',
  './vendor/katex/fonts/KaTeX_Main-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Math-BoldItalic.ttf',
  './vendor/katex/fonts/KaTeX_Math-BoldItalic.woff',
  './vendor/katex/fonts/KaTeX_Math-BoldItalic.woff2',
  './vendor/katex/fonts/KaTeX_Math-Italic.ttf',
  './vendor/katex/fonts/KaTeX_Math-Italic.woff',
  './vendor/katex/fonts/KaTeX_Math-Italic.woff2',
  './vendor/katex/fonts/KaTeX_SansSerif-Bold.ttf',
  './vendor/katex/fonts/KaTeX_SansSerif-Bold.woff',
  './vendor/katex/fonts/KaTeX_SansSerif-Bold.woff2',
  './vendor/katex/fonts/KaTeX_SansSerif-Italic.ttf',
  './vendor/katex/fonts/KaTeX_SansSerif-Italic.woff',
  './vendor/katex/fonts/KaTeX_SansSerif-Italic.woff2',
  './vendor/katex/fonts/KaTeX_SansSerif-Regular.ttf',
  './vendor/katex/fonts/KaTeX_SansSerif-Regular.woff',
  './vendor/katex/fonts/KaTeX_SansSerif-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Script-Regular.ttf',
  './vendor/katex/fonts/KaTeX_Script-Regular.woff',
  './vendor/katex/fonts/KaTeX_Script-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Size1-Regular.ttf',
  './vendor/katex/fonts/KaTeX_Size1-Regular.woff',
  './vendor/katex/fonts/KaTeX_Size1-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Size2-Regular.ttf',
  './vendor/katex/fonts/KaTeX_Size2-Regular.woff',
  './vendor/katex/fonts/KaTeX_Size2-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Size3-Regular.ttf',
  './vendor/katex/fonts/KaTeX_Size3-Regular.woff',
  './vendor/katex/fonts/KaTeX_Size3-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Size4-Regular.ttf',
  './vendor/katex/fonts/KaTeX_Size4-Regular.woff',
  './vendor/katex/fonts/KaTeX_Size4-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Typewriter-Regular.ttf',
  './vendor/katex/fonts/KaTeX_Typewriter-Regular.woff',
  './vendor/katex/fonts/KaTeX_Typewriter-Regular.woff2'
];

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './vendor/katex/katex.min.css',
  './vendor/katex/katex.min.js',
  './css/style.css',
  './css/nori-companion.css',
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
  './js/nori-companion.js',
  './js/app.js',
  './js/utils.js?v=60.0',
  './js/production-chat.js?v=7.0',
  './js/pwa-installer.js?v=61.0',
  './js/bm25-engine.js?v=1.0',
  './js/hybrid-retrieval.js?v=2.0',
  './js/document-ingestion.js?v=1.0',
  './js/artifacts-engine.js?v=1.0',
  './js/agent-system.js?v=1.0',
  './js/deep-research-engine.js?v=1.0',
  './js/create-studio.js?v=1.0',
  './js/diff-coding-agent.js?v=1.0',
  './js/autonomous-agent.js?v=1.0',
  './css/milo-workspace-studio.css?v=1.0',
  './css/onyx-theme.css?v=70.0',
  './js/onyx-interface.js?v=70.0',
  './assets/milo_robot_mascot.png',
  './assets/nexus_yellow_bot.png',
  './manifest.json',
  ...KATEX_FONTS
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
    }).catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
