const CACHE_NAME = 'gpx-track-v5';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/styles.css',
    // Core JavaScript files
    '/js/core/app.js',
    '/js/core/event-bus.js',
    '/js/core/config.js',
    // Data layer
    '/js/data/track-data-store.js',
    '/js/data/location-data-store.js',
    '/js/data/geo-utils.js',
    '/js/data/geo-point.js',
    // UI layer
    '/js/ui/ui-state-manager.js',
    '/js/ui/ui-controls.js',
    '/js/ui/progress-display.js',
    // Map layer
    '/js/map/map-renderer.js',
    '/js/map/track-renderer.js',
    '/js/map/location-renderer.js',
    // Services layer
    '/js/services/track-manager.js',
    '/js/services/location-tracker.js',
    '/js/services/progress-tracker.js',
    '/js/services/external-services.js',
    // Icons
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    // Libraries
    '/libs/togeojson.min.js',
    // Mapbox resources
    'https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.js',
    'https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.css'
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
                    })
                    .catch(async () => {
                        // Fallback: try to fetch from GitHub raw if same-origin
                        try {
                            const url = new URL(event.request.url);
                            if (url.origin === self.location.origin) {
                                // Remove leading slash for GitHub raw path
                                const githubPath = url.pathname.replace(/^\//, '');
                                const githubRawUrl = `https://raw.githubusercontent.com/brownrl/gpxtrack/main/${githubPath}`;
                                const githubResponse = await fetch(githubRawUrl);
                                if (githubResponse.ok) {
                                    return githubResponse;
                                }
                            }
                        } catch (e) {
                            // Ignore errors, fall through to offline response
                        }
                        // Offline fallback
                        return new Response('Offline - Cannot fetch resource');
                    });
            })
    );
});
