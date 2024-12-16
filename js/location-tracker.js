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
    watchTimeoutId: null,
    currentLocation: null,
    previousLocation: null, // Store the last location for heading calculation
    lastUpdateTime: 0,     // Last time we updated the map
    currentRetry: 0,       // Current retry count
    isAnimating: false,    // Track if we're currently animating
    forceLocationUpdate: true, // Force update on first location or after unpausing
    lastGoodPosition: null,  // Store the last position that met accuracy requirements
    
    // Configuration
    zoomLevel: 16,
    circleRadius: 10,
    circleColor: '#0066ff',
    locationEnableHighAccuracy: true,
    locationMaximumAge: 1000,
    locationTimeout: 10000, // Increased timeout to 30 seconds
    retryDelay: 5000,      // Delay before retrying after timeout
    maxRetries: 3,         // Maximum number of retries
    updateInterval: 5000,  // Fixed 5-second update interval
    maxAccuracy: 1000,      // Maximum acceptable accuracy in meters
    animationDuration: 1000, // Duration in ms for animations
    
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

        // Clear any existing watch and timer
        this.clearLocationWatch();
        
        this.forceLocationUpdate = true;
        this.previousLocation = null;
        this.lastUpdateTime = 0;
        this.lastGoodPosition = null;

        // Setup map layers
        this.setupLocationSourceAndLayer();
        
        // Start continuous location watching
        this.startLocationWatch();
        
        // Start the update cycle
        this.startUpdateCycle();
    },

    /**
     * Start continuous location watching
     */
    startLocationWatch() {
        if (this.paused) return;

        this.watchId = navigator.geolocation.watchPosition(
            this.handlePositionUpdate.bind(this),
            this.handleLocationError.bind(this),
            {
                enableHighAccuracy: this.locationEnableHighAccuracy,
                timeout: this.locationTimeout,
                maximumAge: this.locationMaximumAge
            }
        );
        console.log('Location watch started: ' + this.watchId);
    },

    /**
     * Start the cycle of updating the map and tracking
     */
    startUpdateCycle() {
        if (this.paused) return;
        
        // Schedule the next update
        this.updateTimeoutId = setInterval(() => {
            if (this.lastGoodPosition) {
                this.updateLocation(this.lastGoodPosition);
            }
        }, this.updateInterval);
    },

    /**
     * Handle raw position update from geolocation
     */
    handlePositionUpdate(position) {
        console.log(`Location update: ${position.coords.latitude}, ${position.coords.longitude}, accuracy: ${position.coords.accuracy}, timestamp: ${position.timestamp}`);
        
        // If accuracy is good enough, store this position
        if (position.coords.accuracy <= this.maxAccuracy) {
            this.lastGoodPosition = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp
            };
            
            // If this is the first position or we're forcing an update, update immediately
            if (this.forceLocationUpdate) {
                this.updateLocation(this.lastGoodPosition);
            }
        }
    },

    /**
     * Clear any active location watch and timers
     */
    clearLocationWatch() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        if (this.updateTimeoutId) {
            clearInterval(this.updateTimeoutId);
            this.updateTimeoutId = null;
        }
    },

    /**
     * Update location with new position data
     * Can be called externally with position data
     * @param {Object} position - Position data with lat, lng, accuracy
     */
    updateLocation(position) {
        const geoPoint = new GeoPoint(position.latitude, position.longitude);
        geoPoint.accuracy = position.accuracy;
        
        // Store current location
        this.currentLocation = geoPoint;

        // Calculate heading if we have a previous location
        let heading = null;
        if (this.previousLocation) {
            heading = this.calculateHeading(
                this.previousLocation,
                geoPoint
            );
        }

        // Update map position and heading
        this.updateMapPosition(geoPoint, heading);

        // Store location for next heading calculation
        this.previousLocation = geoPoint;
        
        // Reset force update flag and update timestamp
        this.forceLocationUpdate = false;
        this.lastUpdateTime = Date.now();

        // Update progress tracker
        this.progressTracker.updateProgress(geoPoint);
    },

    /**
     * Update map with new position and heading
     * Can be called externally with position and heading
     * @param {GeoPoint} geoPoint - Position to update to
     * @param {number|null} heading - Optional heading in degrees
     */
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
     * Setup location source and layer
     */
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
        this.clearLocationWatch();
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