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
    mapInstance: null,
    geoUtils: null,
    progressTracker: null,
    
    // State
    paused: false,
    watchId: null,
    currentLocation: null,
    previousLocations: [], // Store the last location for heading calculation
    lastUpdateTime: 0,     // Last time we updated the map
    currentRetry: 0,       // Current retry count
    isAnimating: false,    // Track if we're currently animating
    forceLocationUpdate: true, // Force update on first location or after unpausing
    
    // Configuration
    zoomLevel: 16,
    circleRadius: 8,
    circleColor: '#0066ff',
    locationEnableHighAccuracy: true,
    locationMaximumAge: 1000,
    locationTimeout: 30000, // Increased timeout to 30 seconds
    retryDelay: 5000,      // Delay before retrying after timeout
    maxRetries: 3,         // Maximum number of retries
    updateInterval: 5000,  // Fixed 5-second update interval
    maxAccuracy: 100,      // Maximum acceptable accuracy in meters
    animationDuration: 5000, // Duration in ms for animations
    
    /**
     * Initialize with app reference
     * @param {Object} app - The app mediator
     */
    init(app) {
        this.app = app;
        this.map = app.map();
        this.mapInstance = this.map.getInstance();
        this.geoUtils = app.geoUtils();
        this.progressTracker = app.progressTracker();
        this.initLocationTracking();
    },

    /**
     * Initialize location tracking
     */
    initLocationTracking() {
        if (!navigator.geolocation) {
            console.error('Geolocation is not supported by this browser.');
            return;
        }

        // Clear any existing watch
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }

        this.forceLocationUpdate = true;  // Force update when starting
        this.previousLocations = [];
        this.lastUpdateTime = 0;

        // Start watching location
        this.startLocationWatch();
    },

    /**
     * Calculate heading based on previous and current position
     * @param {GeoPoint} previousPoint - Previous location
     * @param {GeoPoint} currentPoint - Current location
     * @returns {number|null} - Calculated heading
     */
    calculateHeading(previousPoint, currentPoint) {
        return this.geoUtils.calculateBearing(
            previousPoint.toLatLng(),
            currentPoint.toLatLng()
        );
    },

    /**
     * Updates the map with new location data
     * @param {Object} position - Position object with coords
     */
    onLocationUpdate(position) {
        const currentTime = Date.now();
        const geoPoint = GeoPoint.fromPosition(position);
        
        // Skip if too soon since last update, unless force update is set
        const timeSinceLastUpdate = currentTime - this.lastUpdateTime;
        if (!this.forceLocationUpdate && timeSinceLastUpdate < this.updateInterval) {
            return;
        }

        // Skip if accuracy is very poor
        if (geoPoint.accuracy > this.maxAccuracy) {
            return;
        }

        // Store current location
        this.currentLocation = geoPoint;

        // Calculate heading if we have a previous location
        let heading = null;
        if (this.previousLocations.length > 0) {
            heading = this.calculateHeading(
                this.previousLocations[this.previousLocations.length - 1],
                geoPoint
            );
        }

        // Update map
        this.updateMapPosition(geoPoint, heading);

        // Store location for next heading calculation
        this.previousLocations = [geoPoint];
        
        // Reset force update flag and update timestamp
        this.forceLocationUpdate = false;
        this.lastUpdateTime = currentTime;

        // Update progress tracker
        this.progressTracker.addPoint(geoPoint);
    },

    setupLocationSourceAndLayer() {
        if (!this.mapInstance.getSource('location')) {
            this.mapInstance.addSource('location', {
                type: 'geojson',
                data: {
                    type: 'Point',
                    coordinates: [0, 0]
                }
            });

            this.mapInstance.addLayer({
                id: 'location',
                source: 'location',
                type: 'circle',
                paint: {
                    'circle-radius': this.circleRadius,
                    'circle-color': this.circleColor
                }
            });
        }
    },

    updateMapPosition(geoPoint, heading) {
        // Update the location source
        if (this.mapInstance.getSource('location')) {
            this.mapInstance.getSource('location').setData(geoPoint.toGeoJSON());

            // Only animate if we're not already animating
            if(!this.isAnimating) {
                // Set the animation flag
                this.isAnimating = true;
                
                this.mapInstance.flyTo({
                    center: geoPoint.toArray(),
                    zoom: this.zoomLevel,
                    bearing: heading !== null ? heading : this.mapInstance.getBearing(),
                    duration: this.animationDuration,
                    essential: true
                });
                
                // Reset the flag after the animation
                setTimeout(() => {
                    this.isAnimating = false;
                }, this.animationDuration);
            }
        }
    },

    /**
     * Start watching location with appropriate settings
     */
    startLocationWatch() {
        // Reset retry count when starting fresh
        this.currentRetry = 0;

        this.setupLocationSourceAndLayer();

        const options = {
            enableHighAccuracy: this.locationEnableHighAccuracy,  // Always use high accuracy for outdoor activities
            timeout: this.locationTimeout,
            maximumAge: this.locationMaximumAge  // Keep a small maximumAge for responsiveness
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const positionData = {
                    coords: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        speed: position.coords.speed
                    },
                    timestamp: position.timestamp
                };
                this.onLocationUpdate(positionData);
            },
            this.handleLocationError.bind(this),
            options
        );
    },

    /**
     * Get current location
     * @returns {Object|null} Current location or null if not available
     */
    getCurrentLocation() {
        return this.currentLocation;
    },

    /**
     * Pause location tracking
     */
    pause() {
        this.paused = true;
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    },

    /**
     * Resume location tracking
     */
    resume() {
        this.paused = false;
        this.forceLocationUpdate = true;  // Force update when resuming
        this.initLocationTracking();
    },

    /**
     * Checks if location tracking is paused
     * @returns {boolean} True if paused, false otherwise
     */
    isPaused() {
        return this.paused;
    },

    /**
     * Handle location error
     * @param {Object} error - Error object
     */
    handleLocationError(error) {
        const errorMessages = {
            1: "Location permission denied. Please enable location services for this website.",
            2: "Location unavailable. Please check your GPS settings.",
            3: "Location request timed out."
        };

        console.error("Location error:", errorMessages[error.code] || "Unknown error");

        // Only retry on timeout errors
        if (error.code === error.TIMEOUT && this.currentRetry < this.maxRetries) {
            this.currentRetry++;
            
            // Clear existing watch
            if (this.watchId) {
                navigator.geolocation.clearWatch(this.watchId);
                this.watchId = null;
            }

            // Retry after delay
            setTimeout(() => {
                if (!this.paused) {
                    this.startLocationWatch();
                }
            }, this.retryDelay);
        }
    }
};

export default locationTracker;