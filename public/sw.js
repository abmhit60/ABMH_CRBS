// Service Worker — always fetch fresh, no caching
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())

self.addEventListener('fetch', e => {
  // Always go to network, never serve from cache
  e.respondWith(fetch(e.request))
})
