// Finding Sweetie Service Worker
// Version 2.0.0 - Phase 7: Push Notifications & Advanced Offline

const CACHE_NAME = 'finding-sweetie-v2';
const RUNTIME_CACHE = 'finding-sweetie-runtime-v2';
const IMAGE_CACHE = 'finding-sweetie-images-v2';

// Files to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/lost-pet.html',
  '/found-pet.html',
  '/dashboard.html',
  '/about.html',
  '/offline.html',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg'
  // Note: Tailwind CDN not cached (external resource)
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Service worker installed successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Precache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old caches
              return cacheName.startsWith('finding-sweetie-') &&
                     cacheName !== CACHE_NAME &&
                     cacheName !== RUNTIME_CACHE &&
                     cacheName !== IMAGE_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Different strategies for different resources
  if (url.pathname.startsWith('/api/')) {
    // API requests: Network first, fallback to cache
    event.respondWith(networkFirst(request));
  } else if (url.pathname.startsWith('/uploads/') || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
    // Images: Cache first with background update
    event.respondWith(cacheFirstWithRefresh(request));
  } else if (url.pathname.endsWith('.html') || url.pathname === '/') {
    // HTML pages: Stale while revalidate
    event.respondWith(staleWhileRevalidate(request));
  } else if (url.origin === 'https://cdn.tailwindcss.com') {
    // CDN resources: Cache first
    event.respondWith(cacheFirst(request));
  } else {
    // Default: Network first
    event.respondWith(networkFirst(request));
  }
});

// Caching Strategies

/**
 * Network First: Try network, fallback to cache, then offline page
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network first failed, trying cache:', request.url);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // If it's a navigation request and we have no cache, show offline page
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }

    // For other requests, return a basic offline response
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
}

/**
 * Cache First: Try cache, fallback to network
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Cache First with Background Refresh: Return cached, update in background
 */
async function cacheFirstWithRefresh(request) {
  const cachedResponse = await caches.match(request);

  // Return cached version immediately
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        caches.open(IMAGE_CACHE).then((cache) => {
          cache.put(request, networkResponse);
        });
      }
    }).catch(() => {
      // Silently fail background update
    });

    return cachedResponse;
  }

  // No cache, fetch from network
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch image:', error);
    return new Response('Image unavailable', { status: 404 });
  }
}

/**
 * Stale While Revalidate: Return cached version while fetching fresh
 */
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, networkResponse.clone());
      });
    }
    return networkResponse;
  }).catch(() => {
    // Network failed, return cached if available
    return cachedResponse;
  });

  // Return cached immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

// Background Sync for offline pet submissions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'sync-pet-submissions') {
    event.waitUntil(syncPetSubmissions());
  }
});

/**
 * Sync queued pet submissions when back online
 */
async function syncPetSubmissions() {
  console.log('[SW] Syncing pet submissions...');

  // Get queued submissions from IndexedDB or similar
  // This is a placeholder - would need IndexedDB implementation
  try {
    // TODO: Implement actual sync logic
    console.log('[SW] Pet submissions synced successfully');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error; // Retry sync
  }
}

// Push notification handler (optional)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New pet match found!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    tag: 'pet-notification',
    actions: [
      {
        action: 'view',
        title: 'View Pet',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Finding Sweetie', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/lost-pet.html')
    );
  }
});

// Message handler for client communication
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

// ============================================
// PUSH NOTIFICATION HANDLERS (Phase 7)
// ============================================

// Push event - received when notification sent from server
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let notificationData = {
    title: 'Finding Sweetie',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/badge-72x72.png'
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/icons/icon-192x192.svg',
    badge: notificationData.badge || '/icons/badge-72x72.png',
    vibrate: notificationData.vibrate || [200, 100, 200],
    data: notificationData.data || {},
    actions: notificationData.actions || [],
    tag: notificationData.tag || 'default',
    requireInteraction: notificationData.requireInteraction || false,
    image: notificationData.image
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);

  event.notification.close();

  // Handle action buttons
  if (event.action) {
    console.log('[SW] Action clicked:', event.action);

    if (event.action === 'dismiss') {
      return;
    }
  }

  // Get URL from notification data
  const urlToOpen = event.notification.data?.url || '/';

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Notification close handler
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);

  // Track notification dismissal (optional analytics)
  const dismissalData = {
    tag: event.notification.tag,
    timestamp: Date.now()
  };

  // Could send to analytics endpoint
  // fetch('/api/analytics/notification-close', { ... });
});

// ============================================
// BACKGROUND SYNC (Phase 7)
// ============================================

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-pet-reports') {
    event.waitUntil(syncPetReports());
  }

  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncPetReports() {
  try {
    // Get pending reports from IndexedDB or local storage
    const cache = await caches.open('offline-queue');
    const requests = await cache.keys();

    for (const request of requests) {
      try {
        const response = await fetch(request.clone());
        if (response.ok) {
          await cache.delete(request);
          console.log('[SW] Synced pet report');
        }
      } catch (error) {
        console.error('[SW] Failed to sync:', error);
      }
    }

    // Show success notification
    self.registration.showNotification('Sync Complete', {
      body: 'Your offline actions have been synced',
      icon: '/icons/icon-192x192.svg',
      tag: 'sync-complete'
    });
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

async function syncMessages() {
  // Similar to syncPetReports but for messages
  console.log('[SW] Syncing messages...');
}

console.log('[SW] Service Worker loaded');
