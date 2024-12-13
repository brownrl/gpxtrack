const CACHE_NAME = 'gpx-track-v3';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/styles.css',
    // JavaScript files
    '/js/location-tracker.js',
    '/js/map.js',
    '/js/progress-tracker.js',
    '/js/track-manager.js',
    '/js/ui-controls.js',
    '/js/geo-utils.js',
    '/js/geo-point.js',
    // Icons
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    // Libraries
    '/libs/togeojson.min.js',
    // Mapbox resources
    'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js',
    'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate event - clean up old caches
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
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request)
                    .then((response) => {
                        // Cache new responses for next time
                        if (response.ok) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseClone);
                                });
                        }
                        return response;
                    });
            })
            .catch(() => {
                // Offline fallback
                return new Response('Offline - Cannot fetch resource');
            })
    );
});
