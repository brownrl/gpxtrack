/**
 * location-tracker.js
 * 
 * Handles real-time GPS location tracking and map updates.
 */

import GeoPoint from './geo-point.js';

const locationTracker = {
    // Component references
    app: null,
    map: null,
    geoUtils: null,
    progressTracker: null,

    // Location tracking state
    watchId: null,
    currentLocation: null,
    updateInterval: 5000, // 5 seconds
    updateTimer: null,
    isPaused: false,
    previousLocation: null,

    /**
     * Initialize with app reference
     * @param {Object} app - The app mediator
     */
    init(app) {
        this.app = app;
        this.map = app.map();
        this.geoUtils = app.geoUtils();
        this.progressTracker = app.progressTracker();
        
        // Setup location visualization
        this.map.setupLocationVisualization();
        
        this.initLocationTracking();
    },

    /**
     * Initialize location tracking
     */
    initLocationTracking() {
        // Start continuous location watching
        this.startLocationWatch();
        
        // Start the update cycle
        this.startUpdateCycle();
    },

    /**
     * Start continuous location watching
     */
    startLocationWatch() {
        if ("geolocation" in navigator) {
            this.watchId = navigator.geolocation.watchPosition(
                this.handlePositionUpdate.bind(this),
                this.handleLocationError.bind(this),
                {
                    enableHighAccuracy: true
                }
            );
        }
    },

    /**
     * Start the cycle of updating the map and tracking
     */
    startUpdateCycle() {
        // Clear any existing timer
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        
        // Start new update cycle
        this.updateTimer = setInterval(() => {
            if (!this.isPaused && this.currentLocation) {
                this.updateMap();
            }
        }, this.updateInterval);
    },

    /**
     * Handle raw position update from geolocation
     */
    handlePositionUpdate(position) {
        // Create GeoPoint from position
        const geoPoint = new GeoPoint(
            position.coords.longitude,
            position.coords.latitude
        );

        // Update current location
        this.currentLocation = geoPoint;
    },

    /**
     * Update map with current location
     */
    updateMap() {
        if (!this.currentLocation) return;

        // Calculate heading if we have a previous location
        let heading = null;
        if (this.previousLocation) {
            heading = this.calculateHeading(this.previousLocation, this.currentLocation);
        }

        // Update map position with new location and heading
        this.map.updateLocationVisualization(this.currentLocation, heading);

        // Store current location as previous for next heading calculation
        this.previousLocation = this.currentLocation;

        // Update progress tracker
        this.progressTracker.updateProgress(this.currentLocation);
    },

    /**
     * Calculate heading based on previous and current position
     */
    calculateHeading(previousPoint, currentPoint) {
        return this.geoUtils.calculateBearing(
            previousPoint.toLatLng(),
            currentPoint.toLatLng()
        );
    },

    /**
     * Clear any active location watch and timers
     */
    clearLocationWatch() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    },

    /**
     * Get current location
     */
    getCurrentLocation() {
        return this.currentLocation;
    },

    /**
     * Pause location tracking
     */
    pause() {
        this.isPaused = true;
    },

    /**
     * Resume location tracking
     */
    resume() {
        this.isPaused = false;
    },

    /**
     * Handle location error
     */
    handleLocationError(error) {
        console.error('Error getting location:', error.message);
    }
};

export default locationTracker;