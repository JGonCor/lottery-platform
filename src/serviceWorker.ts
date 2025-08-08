// Service Worker for Progressive Web App functionality
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { Queue } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope;

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Cache strategies for different resource types
const CACHE_NAMES = {
  static: 'static-cache-v1',
  api: 'api-cache-v1',
  images: 'images-cache-v1',
  fonts: 'fonts-cache-v1',
};

// Cache static assets (JS, CSS)
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new CacheFirst({
    cacheName: CACHE_NAMES.static,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Cache fonts with long-term caching
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: CACHE_NAMES.fonts,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
    ],
  })
);

// Cache images with stale-while-revalidate
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.images,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// Cache API responses with network-first strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: CACHE_NAMES.api,
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Background sync for failed requests
const bgSyncPlugin = new BackgroundSyncPlugin('failed-requests', {
  maxRetentionTime: 24 * 60, // 24 hours in minutes
});

// Queue for background sync
const queue = new Queue('lottery-transactions', {
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log('Background sync successful for:', entry.request.url);
      } catch (error) {
        console.error('Background sync failed for:', entry.request.url, error);
        // Re-queue failed requests
        await queue.unshiftRequest(entry);
        break;
      }
    }
  },
});

// Handle critical Web3 transactions with background sync
registerRoute(
  ({ url, request }) => 
    url.pathname.includes('/api/lottery/') && 
    (request.method === 'POST' || request.method === 'PUT'),
  new NetworkFirst({
    plugins: [bgSyncPlugin],
  })
);

// Handle navigation requests (SPA routing)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'navigation-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
);

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const { title, body, icon, badge, tag, actions, data: notificationData } = data;

    const options: NotificationOptions = {
      body,
      icon: icon || '/icon-192x192.png',
      badge: badge || '/badge-72x72.png',
      tag: tag || 'lottery-notification',
      data: notificationData,
      actions: actions || [],
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action, data } = event;
  let url = '/';

  if (data?.url) {
    url = data.url;
  } else if (action) {
    switch (action) {
      case 'view-tickets':
        url = '/tickets';
        break;
      case 'view-results':
        url = '/winners';
        break;
      case 'buy-ticket':
        url = '/?action=buy';
        break;
      default:
        url = '/';
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }

        // If no existing window/tab, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handle service worker updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic background sync for lottery data
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'lottery-data-sync') {
    event.waitUntil(syncLotteryData());
  }
});

// Sync lottery data in background
async function syncLotteryData() {
  try {
    const response = await fetch('/api/lottery/updates');
    if (response.ok) {
      const data = await response.json();
      
      // Store updated data in cache
      const cache = await caches.open(CACHE_NAMES.api);
      await cache.put('/api/lottery/info', new Response(JSON.stringify(data)));
      
      // Send update to clients
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'LOTTERY_DATA_UPDATE',
          data: data,
        });
      });
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  // Force activate immediately
  event.waitUntil(self.skipWaiting());
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Claim all clients immediately
      self.clients.claim(),
      
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old cache versions
              return !Object.values(CACHE_NAMES).includes(cacheName) &&
                     !cacheName.startsWith('workbox-');
            })
            .map((cacheName) => caches.delete(cacheName))
        );
      }),
    ])
  );
});

// Handle fetch events for offline functionality
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests for background sync
  if (event.request.method !== 'GET') {
    // Add POST requests to background sync queue if they fail
    if (event.request.url.includes('/api/lottery/')) {
      event.respondWith(
        fetch(event.request).catch(() => {
          queue.pushRequest({ request: event.request });
          return new Response(
            JSON.stringify({ 
              error: 'Request queued for background sync',
              queued: true 
            }),
            { 
              status: 202,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
      );
    }
    return;
  }

  // Handle GET requests with cache strategies
  if (event.request.url.includes('/api/')) {
    // API requests - try network first, fallback to cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAMES.api).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Return offline fallback for critical API endpoints
            if (event.request.url.includes('/api/lottery/info')) {
              return new Response(
                JSON.stringify({
                  error: 'Offline',
                  jackpot: '0',
                  ticketPrice: '5',
                  offline: true,
                }),
                {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                }
              );
            }
            
            throw new Error('No cached response available');
          });
        })
    );
  }
});

// Export service worker for TypeScript
export {};

// Type declarations for Workbox
declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: any;
  }
}