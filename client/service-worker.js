const CACHE_NAME = 'eliena-shell-v3';
const APP_SHELL = [
  '/',
  '/index.html',
  '/css/base.css',
  '/css/tokens.css',
  '/css/app-shell.css',
  '/css/components.css',
  '/css/motion.css',
  '/js/app.js',
  '/js/services/chat-api.js',
  '/js/data/mock-data.js',
  '/js/ui/icons.js',
  '/js/ui/templates.js',
  '/js/ui/assistant-state.js',
  '/js/ui/toast.js',
  '/manifest.webmanifest',
  '/assets/eliena-mark.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (!response.ok) return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }))
  );
});
