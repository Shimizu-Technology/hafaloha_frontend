// Service Worker for Hafaloha Web App
// Handles push notifications and offline functionality

const CACHE_NAME = 'hafaloha-cache-v2';
const ADMIN_CACHE_NAME = 'hafaloha-admin-cache-v1';
const API_CACHE_NAME = 'hafaloha-api-cache-v1';
const OFFLINE_URL = '/offline.html';
const VERSION = '1.1.0'; // Increment this when you update the service worker

console.log(`[Service Worker] Initializing service worker version ${VERSION}`);

// Core app files to cache for offline use
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/badge-96.png'
];

// Admin-specific assets to cache (will be cached on first visit to admin)
const adminUrlsToCache = [
  '/admin',
  // Note: Admin JS chunks will be cached automatically when loaded
];

// Install event - cache assets for offline use
self.addEventListener('install', event => {
  console.log(`[Service Worker] Installing Service Worker version ${VERSION}...`);
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  console.log('[Service Worker] Skip waiting called');
  
  event.waitUntil(
    Promise.all([
      // Cache core app assets
      caches.open(CACHE_NAME)
        .then(cache => {
          console.log('[Service Worker] Caching app shell');
          return cache.addAll(urlsToCache);
        }),
      // Prepare admin cache (empty for now, will be populated on demand)
      caches.open(ADMIN_CACHE_NAME)
        .then(cache => {
          console.log('[Service Worker] Admin cache ready');
          return Promise.resolve();
        }),
      // Prepare API cache
      caches.open(API_CACHE_NAME)
        .then(cache => {
          console.log('[Service Worker] API cache ready');
          return Promise.resolve();
        })
    ])
      .then(() => {
        console.log('[Service Worker] All caches initialized successfully');
      })
      .catch(error => {
        console.error('[Service Worker] Cache install error:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log(`[Service Worker] Activating Service Worker version ${VERSION}...`);
  
  // Claim clients to ensure the service worker controls all clients immediately
  const claimPromise = self.clients.claim()
    .then(() => {
      console.log('[Service Worker] Clients claimed successfully');
    })
    .catch(error => {
      console.error('[Service Worker] Error claiming clients:', error);
    });
  
  // Clean up old caches
  const cleanCachesPromise = caches.keys()
    .then(cacheNames => {
      console.log('[Service Worker] Found caches:', cacheNames);
      return Promise.all(
        cacheNames.map(cacheName => {
          // Keep current version caches
          if (cacheName !== CACHE_NAME && 
              cacheName !== ADMIN_CACHE_NAME && 
              cacheName !== API_CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[Service Worker] Cache cleanup completed');
    })
    .catch(error => {
      console.error('[Service Worker] Error cleaning caches:', error);
    });
  
  // Wait for both operations to complete
  event.waitUntil(Promise.all([claimPromise, cleanCachesPromise]));
  
  // Log that we're ready to handle push events
  console.log('[Service Worker] Ready to handle push events');
});

// Helper function to determine cache strategy based on request
function getCacheStrategy(request) {
  const url = new URL(request.url);
  
  // Admin routes - cache admin chunks aggressively
  if (url.pathname.startsWith('/admin') || 
      url.pathname.includes('admin-') ||
      url.pathname.includes('Admin')) {
    return { cacheName: ADMIN_CACHE_NAME, strategy: 'cache-first' };
  }
  
  // API routes - use network-first with short cache
  if (url.pathname.startsWith('/api/')) {
    return { cacheName: API_CACHE_NAME, strategy: 'network-first' };
  }
  
  // Static assets - cache-first
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image') {
    return { cacheName: CACHE_NAME, strategy: 'cache-first' };
  }
  
  // Default - network-first for HTML
  return { cacheName: CACHE_NAME, strategy: 'network-first' };
}

// Fetch event - serve from cache if available, otherwise fetch from network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  const { cacheName, strategy } = getCacheStrategy(event.request);
  
  if (strategy === 'cache-first') {
    // Cache-first strategy (good for static assets)
    event.respondWith(
      caches.open(cacheName)
        .then(cache => {
          return cache.match(event.request)
            .then(response => {
              if (response) {
                return response;
              }
              
              return fetch(event.request)
                .then(response => {
                  // Don't cache responses that aren't successful
                  if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                  }
                  
                  // Clone the response since it can only be consumed once
                  const responseToCache = response.clone();
                  
                  // Cache the successful response
                  try {
                    cache.put(event.request, responseToCache);
                  } catch (cacheError) {
                    console.warn('[Service Worker] Cache put error:', cacheError);
                  }
                  
                  return response;
                })
                .catch(error => {
                  console.error('[Service Worker] Fetch error:', error);
                  // Return offline page for navigation requests
                  if (event.request.mode === 'navigate') {
                    return cache.match(OFFLINE_URL);
                  }
                  return new Response(JSON.stringify({ error: 'Network request failed' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                  });
                });
            });
        })
    );
  } else {
    // Network-first strategy (good for API calls and HTML)
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response for caching
          const responseToCache = response.clone();
          
          // Cache successful responses
          if (response.status === 200) {
            caches.open(cacheName)
              .then(cache => {
                try {
                  cache.put(event.request, responseToCache);
                } catch (cacheError) {
                  console.warn('[Service Worker] Cache put error:', cacheError);
                }
              })
              .catch(cacheOpenError => {
                console.warn('[Service Worker] Cache open error:', cacheOpenError);
              });
          }
          
          return response;
        })
        .catch(error => {
          console.error('[Service Worker] Network fetch failed:', error);
          // Try to serve from cache
          return caches.open(cacheName)
            .then(cache => {
              return cache.match(event.request)
                .then(response => {
                  if (response) {
                    return response;
                  }
                  
                  // Return offline page for navigation requests
                  if (event.request.mode === 'navigate') {
                    return cache.match(OFFLINE_URL);
                  }
                  
                  return new Response(JSON.stringify({ error: 'Service unavailable' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                  });
                });
            });
        })
    );
  }
});

// Push event - handle incoming push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received:', event);
  
  let data = {};
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (error) {
    console.error('[Service Worker] Error parsing push data:', error);
    data = {
      title: 'New Notification',
      body: 'Something new happened in Hafaloha.',
      icon: '/icons/icon-192.png'
    };
  }
  
  const title = data.title || 'Hafaloha';
  const options = {
    body: data.body || 'New notification from Hafaloha',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-96.png',
    tag: data.tag || 'hafaloha-notification',
    data: data.data || {},
    actions: data.actions || [],
    vibrate: [100, 50, 100],
    renotify: true,
    requireInteraction: true
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event - handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click:', event);
  
  event.notification.close();
  
  // Handle notification action clicks
  if (event.action) {
    console.log('[Service Worker] Action clicked:', event.action);
    
    // Handle specific actions
    if (event.action === 'view' && event.notification.data && event.notification.data.url) {
      event.waitUntil(
        clients.openWindow(event.notification.data.url)
      );
      return;
    }
    
    if (event.action === 'acknowledge' && event.notification.data) {
      // Use orderNumber if available, fall back to orderId for backward compatibility
      const orderIdentifier = event.notification.data.orderNumber || event.notification.data.orderId;
      // TODO: Implement order acknowledgment via API call
      console.log('[Service Worker] Acknowledging order:', orderIdentifier);
      return;
    }
  }
  
  // Default behavior - open or focus the app and go to the admin dashboard
  const orderUrl = event.notification.data && event.notification.data.url ? 
    event.notification.data.url : '/admin';
  
  // If we have a defaultTab in the notification data, store it in localStorage
  // This will be used by the AdminDashboard component to set the active tab
  if (event.notification.data && event.notification.data.defaultTab) {
    // We need to use clients.openWindow or client.navigate to access the page
    // But first, let's store the tab preference in localStorage
    const defaultTab = event.notification.data.defaultTab;
    
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then(clientList => {
          // If a window is already open, focus it and navigate
          for (const client of clientList) {
            if ('focus' in client) {
              client.focus();
              
              // Execute script to set the localStorage value for adminTab
              client.postMessage({
                type: 'SET_ADMIN_TAB',
                tab: defaultTab
              });
              
              // Navigate to the admin dashboard
              return client.navigate(orderUrl);
            }
          }
          
          // Otherwise open a new window to the admin dashboard
          // The AdminDashboard component will read the localStorage value
          if (clients.openWindow) {
            // We can't set localStorage here directly, so we'll rely on the
            // AdminDashboard component's default behavior for new windows
            return clients.openWindow(orderUrl);
          }
        })
    );
  } else {
    // No defaultTab, just navigate to the URL
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then(clientList => {
          // If a window is already open, focus it and navigate
          for (const client of clientList) {
            if ('focus' in client) {
              client.focus();
              return client.navigate(orderUrl);
            }
          }
          
          // Otherwise open a new window
          if (clients.openWindow) {
            return clients.openWindow(orderUrl);
          }
        })
    );
  }
});

// Notification close event - handle notification dismissals
self.addEventListener('notificationclose', event => {
  console.log('[Service Worker] Notification closed:', event);
});

console.log('[Service Worker] Service Worker registered successfully');
