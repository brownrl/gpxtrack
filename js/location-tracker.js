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
    locationMaximumAge: 2000,
    locationTimeout: 30000, // Increased timeout to 30 seconds
    retryDelay: 5000,      // Delay before retrying after timeout
    maxRetries: 3,         // Maximum number of retries
    minSpeed: 0.3,        // Minimum speed in m/s (1.08 km/h)
    animationDuration: 1000, // Duration in ms for animations
    maxAccuracy: 100,      // Maximum acceptable accuracy in meters
    speedThresholds: {     // Speed thresholds for different update intervals
        stationary: 0.2,   // m/s (0.72 km/h)
        walking: 2,        // m/s (7.2 km/h)
        running: 4,        // m/s (14.4 km/h)
        cycling: 8         // m/s (28.8 km/h)
    },
    locationUpdateIntervals: {
        stationary: 10000,  // Every 10s when stationary
        walking: 6000,      // Every 6s when walking slowly
        running: 4000,      // Every 4s when walking fast/running
        cycling: 2000,      // Every 2s when cycling
        veryFast: 1000      // Every 1s when moving very fast
    },
    
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
     * Get appropriate update interval based on speed
     * @param {number} speed - Speed in m/s
     * @returns {number} Update interval in ms
     */
    getUpdateInterval(speed) {
        if (speed < this.speedThresholds.stationary) return this.locationUpdateIntervals.stationary;  // Every 10s when stationary
        if (speed < this.speedThresholds.walking) return this.locationUpdateIntervals.walking;     // Every 6s when walking slowly
        if (speed < this.speedThresholds.running) return this.locationUpdateIntervals.running;     // Every 4s when walking fast/running
        if (speed < this.speedThresholds.cycling) return this.locationUpdateIntervals.cycling;     // Every 2s when cycling
        return this.locationUpdateIntervals.veryFast;  // Every 1s when moving very fast
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
     * Calculate heading based on previous and current position
     * @param {GeoPoint} previousPoint - Previous location
     * @param {GeoPoint} currentPoint - Current location
     * @returns {number|null} - Calculated heading or null if speed too low
     */
    calculateHeading(previousPoint, currentPoint) {
        // Check if we're moving
        const speed = currentPoint.speed || 0;
        if (speed < this.minSpeed) return null;

        // Calculate heading between previous and current point
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
        const speed = geoPoint.speed || 0;
        
        // Get dynamic update interval based on speed
        const dynamicInterval = this.getUpdateInterval(speed);
        const timeSinceLastUpdate = currentTime - this.lastUpdateTime;

        // Skip update if too soon, unless force update is set
        if (!this.forceLocationUpdate && timeSinceLastUpdate < dynamicInterval) {
            return;
        }

        // Skip if accuracy is very poor
        if (geoPoint.accuracy > this.maxAccuracy) {
            return;
        }

        // Calculate heading if we have a previous location
        let heading = null;
        if (this.previousLocations.length > 0) {
            heading = this.calculateHeading(
                this.previousLocations[0],
                geoPoint
            );
        }

        this.currentLocation = geoPoint;
        this.lastUpdateTime = currentTime;

        // Update previous location
        this.previousLocations = [geoPoint];

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

            this.forceLocationUpdate = false;  // Reset the force update flag
        }

        // Update progress through app mediator
        this.progressTracker.updateProgress(geoPoint.toLatLng());
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