const CACHE_NAME = 'gpx-track-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.php',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/@tmcw/togeojson@5.8.1/dist/togeojson.umd.js'
];

// Install service worker and cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
});

// Activate and clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Serve cached content when offline
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin) && 
        !event.request.url.startsWith('https://unpkg.com/')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response; // Return cached version
                }
                return fetch(event.request)
                    .then((response) => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response as it can only be consumed once
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Return a fallback response if offline and no cache
                        if (event.request.url.includes('tile.openstreetmap.org')) {
                            // Return empty tile for map requests
                            return new Response();
                        }
                    });
            })
    );
});
