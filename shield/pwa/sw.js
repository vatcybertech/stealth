// SHIELD PWA — service worker.
//
// - Cache-first for all app assets (offline-capable).
// - Bumps CACHE_NAME to force update on code changes.
// - NEVER caches responses from the Mac Sentinel's HTTPS API — those
//   must always go through live (they contain fresh state).
// - Handles push notifications (iOS 16.4+ when installed to home screen).

'use strict';

const CACHE_NAME = 'shield-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './app.js',
  './crypto.js',
  './js/storage.js',
  './js/ledger.js',
  './js/sentinel-client.js',
  './js/checklist.js',
  './js/shortcuts.js',
  './js/ui.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isSentinelRequest(url) {
  // Any request to loopback or local-network sentinel should NOT be cached.
  if (/^https?:\/\/(127\.0\.0\.1|localhost|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1]))/i.test(url)) return true;
  return false;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = req.url;

  if (isSentinelRequest(url)) {
    // Pass through without caching.
    event.respondWith(fetch(req).catch(() => new Response(
      JSON.stringify({ error: 'sentinel-unreachable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )));
    return;
  }

  // Cache-first for app assets
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.status === 200 && fresh.type !== 'opaque') {
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch {
      // Offline fallback: return index.html for navigation requests
      if (req.mode === 'navigate') {
        const fallback = await cache.match('./index.html');
        if (fallback) return fallback;
      }
      return new Response('offline', { status: 503 });
    }
  })());
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || 'SHIELD Alert';
  const options = {
    body: data.body || 'An event was logged.',
    icon: './icons/icon-192.svg',
    badge: './icons/icon-192.svg',
    tag: data.tag || 'shield-alert',
    renotify: true,
    requireInteraction: data.severity === 'CRITICAL',
    data: data,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window' });
    if (all.length > 0) { all[0].focus(); return; }
    await self.clients.openWindow('./index.html');
  })());
});
