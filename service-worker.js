const CACHE_NAME = 'kannada-baruthe-boss-v1';
const STATIC_CACHE_NAME = 'kannada-static-v1';
const DYNAMIC_CACHE_NAME = 'kannada-dynamic-v1';

// Core app shell files that should be cached immediately
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './data/favicon.ico'
];

// External resources that we want to cache but with different strategy
const EXTERNAL_RESOURCES = [
  'https://cdn.tailwindcss.com',
  'https://rsms.me/inter/inter.css'
];

// Maximum number of items in dynamic cache
const MAX_DYNAMIC_CACHE_SIZE = 50;

// Utility function to limit cache size
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxSize) {
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxSize);
  }
}

// Install event: Cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Cache external resources with error handling
      caches.open(DYNAMIC_CACHE_NAME).then(cache => {
        console.log('Service Worker: Caching external resources');
        return Promise.allSettled(
          EXTERNAL_RESOURCES.map(url => 
            fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              })
              .catch(error => {
                console.warn(`Failed to cache ${url}:`, error);
              })
          )
        );
      })
    ]).then(() => {
      console.log('Service Worker: Installation complete');
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

// Activate event: Clean up old caches and take control
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        const validCaches = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME];
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!validCaches.includes(cacheName)) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker: Activation complete');
    })
  );
});

// Fetch event: Implement different caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Strategy 1: Static assets - Cache First
        if (STATIC_ASSETS.some(asset => request.url.includes(asset.replace('./', '')))) {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }

        // Strategy 2: External resources - Stale While Revalidate
        if (EXTERNAL_RESOURCES.some(resource => request.url.includes(resource))) {
          const cachedResponse = await caches.match(request);
          
          // Always try to update in background
          const fetchPromise = fetch(request)
            .then(response => {
              if (response.ok) {
                const cache = caches.open(DYNAMIC_CACHE_NAME);
                cache.then(c => c.put(request, response.clone()));
              }
              return response;
            })
            .catch(error => {
              console.warn('Failed to fetch external resource:', request.url, error);
              return null;
            });

          // Return cached version immediately if available, otherwise wait for network
          if (cachedResponse) {
            fetchPromise; // Update in background
            return cachedResponse;
          } else {
            return await fetchPromise || createOfflineResponse(request);
          }
        }

        // Strategy 3: API calls and dynamic content - Network First
        if (url.hostname.includes('googleapis.com') || 
            url.hostname.includes('firebaseapp.com') || 
            url.hostname.includes('firestore') ||
            url.pathname.includes('api/')) {
          
          try {
            const networkResponse = await fetch(request);
            
            // Only cache successful responses for certain types
            if (networkResponse.ok && !request.url.includes('upload')) {
              const cache = await caches.open(DYNAMIC_CACHE_NAME);
              cache.put(request, networkResponse.clone());
              limitCacheSize(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_CACHE_SIZE);
            }
            
            return networkResponse;
          } catch (error) {
            console.warn('Network request failed:', request.url, error);
            const cachedResponse = await caches.match(request);
            return cachedResponse || createOfflineResponse(request);
          }
        }

        // Strategy 4: Everything else - Cache First with Network Fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          const cache = await caches.open(DYNAMIC_CACHE_NAME);
          cache.put(request, networkResponse.clone());
          limitCacheSize(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_CACHE_SIZE);
        }
        
        return networkResponse;

      } catch (error) {
        console.error('Fetch error:', error);
        
        // Try to return cached response as fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          const offlineResponse = await caches.match('./index.html');
          return offlineResponse || createOfflineResponse(request);
        }
        
        return createOfflineResponse(request);
      }
    })()
  );
});

// Create a basic offline response
function createOfflineResponse(request) {
  if (request.destination === 'document') {
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Kannada Baruthe, Boss</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #ECFDF5; }
            .offline-message { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <h1>You're Offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
  
  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' }
  });
}

// Handle background sync for when connection is restored
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync triggered');
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Add any background sync logic here
      console.log('Performing background sync...')
    );
  }
});

// Handle push notifications (for future use)
self.addEventListener('push', event => {
  console.log('Service Worker: Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'New content available!',
    icon: './data/favicon.ico',
    badge: './data/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Kannada Baruthe, Boss', options)
  );
});