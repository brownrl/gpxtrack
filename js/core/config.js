/**
 * config.js
 * Centralized application configuration
 */

const config = {
    // Map Configuration
    map: {
        container: 'map',
        style: 'mapbox://styles/brownrl/cmc3e2a2j00ho01sdamtf6oc8',
        center: [10, 50], // Center over Europe
        zoom: 4, // Zoom level to show Europe
        interactive: false, // Disable interactions by default
        defaultZoom: 16,
        zoomOffset: {
            min: -2,
            max: 2,
            default: 0
        }
    },

    // Track Visualization
    track: {
        style: {
            lineColor: '#FFFF00',
            lineWeight: 4
        },
        arrows: {
            width: 24,
            height: 24,
            color: '#FFFFFF',  // Brighter color
            frequency: 4       // Draw arrow every Nth point
        },
        interpolation: {
            distance: 50 // meters between interpolated points
        },
        visualization: {
            showOnLoad: false, // Don't fit bounds on track load for speed
            fitBoundsPadding: 50,
            showDuration: 4000 // milliseconds to show full track
        }
    },

    // Location Tracking
    location: {
        style: {
            circle: {
                radius: 8,
                color: '#0088FF',
                opacity: 1
            }
        },
        animation: {
            duration: 1000,
            essential: true
        },
        tracking: {
            updateInterval: 5000, // 5 seconds
            minimumDistanceForHeadings: 4, // meters
            options: {
                enableHighAccuracy: true,
                maximumAge: 4000,
                timeout: 60000
            }
        }
    },

    // Progress Tracking
    progress: {
        updateInterval: 60000, // Update interval in milliseconds (1 minute)
        offTrackThreshold: 50, // meters - distance at which user is considered off track
        displayId: 'progress-display'
    },

    // UI Controls
    ui: {
        hideTimeout: 3000, // Time in milliseconds before UI controls fade out
        selectors: {
            // By ID
            openMapsBtn: '#open-maps-btn',
            openLodgingBtn: '#open-lodging-btn',
            openMarketBtn: '#open-market-btn',
            openCampingBtn: '#open-camping-btn',
            openRestaurantBtn: '#open-restaurant-btn',
            openHospitalBtn: '#open-hospital-btn',
            gpxFileInput: '#gpx-file',
            filePickerBtn: '#file-picker-btn',
            zoomBtn: '#zoom-btn',
            reloadBtn: '#reload-btn',
            clearBtn: '#clear-btn',
            gMapsBtn: '#gmaps-btn',
            locationOverlay: '#location-overlay',

            // By class
            buttonsContainer: '.ui-controls-container',
            drawerButtons: '.drawer-buttons',
            gmapsDrawer: '.gmaps-drawer'
        }
    },

    // Storage
    storage: {
        keys: {
            lastGpxContent: 'lastGpxContent'
        }
    },

    // External Services
    services: {
        googleMaps: {
            baseUrl: 'https://www.google.com/maps',
            searchTypes: {
                lodging: 'lodging',
                market: 'supermarket',
                camping: 'camping',
                restaurant: 'restaurant',
                hospital: 'hospital'
            }
        }
    },

    // Debug Settings
    debug: {
        eventBus: false, // Enable event bus debugging
        components: false // Enable component debugging
    }
};

export default config;
