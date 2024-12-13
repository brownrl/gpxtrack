/**
 * location-tracker.js
 * 
 * Handles real-time GPS location tracking and map updates.
 */

const locationTracker = {
    paused: false,
    watchId: null,
    currentLocation: null,
    map: null,
    app: null,
    
    // Configuration
    zoomLevel: 16,
    circleRadius: 8,
    circleColor: '#0066ff',
    locationTimeout: 10000,

    /**
     * Initialize with app reference
     * @param {Object} app - The app mediator
     */
    init(app) {
        this.app = app;
        this.initLocationTracking();
    },

    /**
     * Initializes location tracking
     */
    initLocationTracking() {
        this.map = this.app.map().getInstance();

        // Setup location source and layer if they don't exist
        if (!this.map.getSource('location')) {
            this.map.addSource('location', {
                type: 'geojson',
                data: {
                    type: 'Point',
                    coordinates: [0, 0]
                }
            });
            this.map.addLayer({
                id: 'location',
                type: 'circle',
                source: 'location',
                paint: {
                    'circle-radius': this.circleRadius,
                    'circle-color': this.circleColor
                }
            });
        }

        // Start watching position
        this.watchId = navigator.geolocation.watchPosition(
            position => this.onLocationUpdate(position),
            error => console.warn('Location error:', error.message),
            {
                enableHighAccuracy: true,
                timeout: this.locationTimeout,
                maximumAge: 0
            }
        );
    },

    /**
     * Updates the map with new location data
     * @param {Object} position - Position object with coords
     */
    onLocationUpdate(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        this.currentLocation = { lat: latitude, lng: longitude };

        // Update the location source
        if (this.map.getSource('location')) {
            this.map.getSource('location').setData({
                type: 'Point',
                coordinates: [longitude, latitude]
            });

            // Center map on location if not paused
            if (!this.paused) {
                this.map.flyTo({
                    center: [longitude, latitude],
                    zoom: this.zoomLevel
                });
            }
        }

        // Update progress through app mediator
        this.app.progressTracker().updateProgress(this.currentLocation);
    },

    /**
     * Get current location
     * @returns {Object|null} Current location or null if not available
     */
    getCurrentLocation() {
        return this.currentLocation;
    },

    /**
     * Pauses location tracking
     */
    pause() {
        this.paused = true;
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    },

    /**
     * Resumes location tracking
     */
    unpause() {
        this.paused = false;
        this.initLocationTracking();
    },

    /**
     * Checks if location tracking is paused
     * @returns {boolean} True if paused, false otherwise
     */
    isPaused() {
        return this.paused;
    }
};

export default locationTracker;