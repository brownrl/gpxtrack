/**
 * location-data-store.js
 * Centralized location data management with event-driven updates
 */

class LocationDataStore {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.reset();
        this.setupEventListeners();
    }

    /**
     * Reset all location data
     */
    reset() {
        this.currentLocation = null;
        this.previousLocation = null;
        this.locationHistory = [];
        this.heading = null;
        this.accuracy = null;
        this.isTracking = false;
        this.lastUpdateTime = 0;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventBus.on('location:raw-update', this.handleRawLocationUpdate, this);
        this.eventBus.on('location:start-tracking', this.handleStartTracking, this);
        this.eventBus.on('location:stop-tracking', this.handleStopTracking, this);
    }

    /**
     * Handle raw location update from GPS
     * @param {Object} data - Contains position data
     */
    async handleRawLocationUpdate(data) {
        const { position } = data;

        // Import GeoPoint dynamically to avoid circular dependencies
        const { default: GeoPoint } = await import('../data/geo-point.js');

        // Create GeoPoint from position
        const geoPoint = GeoPoint.fromPosition(position);

        // Update location data
        this.updateLocation(geoPoint);
    }

    /**
     * Handle start tracking request
     */
    handleStartTracking() {
        this.isTracking = true;
        this.eventBus.emit('location:tracking-started');
    }

    /**
     * Handle stop tracking request
     */
    handleStopTracking() {
        this.isTracking = false;
        this.eventBus.emit('location:tracking-stopped');
    }

    /**
     * Update current location
     * @param {GeoPoint} geoPoint - New location
     */
    async updateLocation(geoPoint) {
        if (!this.isTracking) return;

        // Store previous location
        this.previousLocation = this.currentLocation;
        this.currentLocation = geoPoint;
        this.lastUpdateTime = Date.now();

        // Update accuracy
        this.accuracy = geoPoint.accuracy;

        // Calculate heading if we have previous location and sufficient movement
        if (this.previousLocation) {
            const distance = this.currentLocation.distanceTo(this.previousLocation);
            const minimumDistance = (await import('../core/config.js')).default.location.tracking.minimumDistanceForHeadings;

            if (distance >= minimumDistance) {
                // Import geoUtils dynamically to avoid circular dependencies
                const { default: geoUtils } = await import('../data/geo-utils.js');
                this.heading = geoUtils.calculateBearing(
                    this.previousLocation.toLatLng(),
                    this.currentLocation.toLatLng()
                );
            }
        }

        // Add to history (keep last 100 points)
        this.locationHistory.push({
            location: geoPoint,
            heading: this.heading,
            timestamp: Date.now()
        });

        if (this.locationHistory.length > 100) {
            this.locationHistory.shift();
        }

        // Emit location update event
        this.eventBus.emit('location:updated', {
            location: this.currentLocation,
            previousLocation: this.previousLocation,
            heading: this.heading,
            accuracy: this.accuracy,
            timestamp: this.lastUpdateTime
        });
    }

    /**
     * Get current location data
     * @returns {Object} Current location data
     */
    getLocationData() {
        return {
            currentLocation: this.currentLocation,
            previousLocation: this.previousLocation,
            heading: this.heading,
            accuracy: this.accuracy,
            isTracking: this.isTracking,
            lastUpdateTime: this.lastUpdateTime,
            locationHistory: [...this.locationHistory] // Return copy
        };
    }

    /**
     * Get current location as GeoPoint
     * @returns {GeoPoint|null} Current location or null
     */
    getCurrentLocation() {
        return this.currentLocation;
    }

    /**
     * Check if currently tracking
     * @returns {boolean} Whether location tracking is active
     */
    isLocationTracking() {
        return this.isTracking;
    }
}

export default LocationDataStore;
