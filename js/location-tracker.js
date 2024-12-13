/**
 * location-tracker.js
 * 
 * Handles real-time GPS location tracking and map updates.
 */

import GeoPoint from './geo-point.js';

const locationTracker = {
    paused: false,
    watchId: null,
    currentLocation: null,
    
    // Component references
    app: null,
    map: null,
    mapInstance: null,
    geoUtils: null,
    progressTracker: null,
    
    // Configuration
    zoomLevel: 16,
    circleRadius: 8,
    circleColor: '#0066ff',
    locationTimeout: 30000, // Increased timeout to 30 seconds
    retryDelay: 5000,      // Delay before retrying after timeout
    maxRetries: 3,         // Maximum number of retries
    currentRetry: 0,       // Current retry count
    previousLocations: [], // Store the last locations for bearing calculation
    headingPoints: 3,      // Reduced from 5 to 3 points for less frequent updates
    minSpeed: 0.3,         // Reduced minimum speed threshold (1.08 km/h)
    maxHeadingChange: 60,  // Increased maximum heading change per update
    headingWeights: [0.2, 0.3, 0.5], // Adjusted weights for 3 points
    isAnimating: false,   // Track if we're currently animating
    animationDuration: 1000, // Duration in ms for animations
    lastHeading: null,    // Store last heading for smoothing
    minRotationThreshold: 15, // Minimum degrees of change needed to rotate map
    wasJustUnpaused: false, // Track if we just unpaused
    isFirstLocation: true,  // Track if this is the first location update
    lastUpdateTime: 0,     // Last time we updated the map
    minUpdateInterval: 2000, // Minimum time between map updates (2 seconds)
    accuracyThreshold: 30,  // Maximum accuracy in meters (more lenient)
    maxAccuracy: 100,      // Maximum acceptable accuracy in meters
    speedThresholds: {     // Speed thresholds for different update intervals
        stationary: 0.2,   // m/s (0.72 km/h)
        walking: 2,        // m/s (7.2 km/h)
        running: 4,        // m/s (14.4 km/h)
        cycling: 8         // m/s (28.8 km/h)
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

        this.isFirstLocation = true;
        this.previousLocations = [];
        this.lastHeading = null;
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
        if (speed < this.speedThresholds.stationary) return 5000;  // Every 5s when stationary
        if (speed < this.speedThresholds.walking) return 3000;     // Every 3s when walking slowly
        if (speed < this.speedThresholds.running) return 2000;     // Every 2s when walking fast/running
        if (speed < this.speedThresholds.cycling) return 1000;     // Every 1s when cycling
        return 500;  // Every 0.5s when moving very fast
    },

    /**
     * Start watching location with appropriate settings
     */
    startLocationWatch() {
        // Reset retry count when starting fresh
        this.currentRetry = 0;
        
        // Setup location source and layer if they don't exist
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

        const options = {
            enableHighAccuracy: true,  // Always use high accuracy for outdoor activities
            timeout: this.locationTimeout,
            maximumAge: 1000  // Keep a small maximumAge for responsiveness
        };

        console.log('Starting location watch with options:', JSON.stringify(options));

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                console.log('Got position update:', {
                    coords: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        speed: position.coords.speed
                    },
                    timestamp: position.timestamp
                });
                this.onLocationUpdate(position);
            },
            this.handleLocationError.bind(this),
            options
        );
    },

    /**
     * Calculate weighted heading from previous points
     * @param {GeoPoint[]} points - Array of previous points
     * @param {GeoPoint} currentPoint - Current location
     * @returns {number|null} - Calculated heading or null if speed too low
     */
    calculateSmoothedHeading(points, currentPoint) {
        if (points.length < 2) return null;

        // Check if we're moving fast enough to calculate heading
        const speed = currentPoint.speed || 0;
        if (speed < this.minSpeed) return this.lastHeading;

        // Calculate time since oldest point
        const timeSpan = currentPoint.timestamp - points[0].timestamp;
        // If points are too old (> 15 seconds), reduce the number of points used
        const maxPoints = timeSpan > 15000 ? 2 : this.headingPoints;
        
        // Use only the most recent points
        const recentPoints = points.slice(-maxPoints);
        
        // Calculate individual headings from recent points
        const headings = [];
        for (let i = 0; i < recentPoints.length - 1; i++) {
            const heading = this.geoUtils.calculateBearing(
                recentPoints[i].toLatLng(),
                recentPoints[i + 1].toLatLng()
            );
            headings.push(heading);
        }

        // Add current heading
        const currentHeading = this.geoUtils.calculateBearing(
            recentPoints[recentPoints.length - 1].toLatLng(),
            currentPoint.toLatLng()
        );
        headings.push(currentHeading);

        // Apply weighted average with dynamic weights
        let smoothedHeading = 0;
        let totalWeight = 0;
        const weights = this.headingWeights.slice(-headings.length);
        
        headings.forEach((heading, i) => {
            // Normalize heading relative to the last heading
            let normalizedHeading = heading;
            if (this.lastHeading !== null) {
                const diff = heading - this.lastHeading;
                if (Math.abs(diff) > 180) {
                    normalizedHeading += diff > 0 ? -360 : 360;
                }
            }
            smoothedHeading += normalizedHeading * weights[i];
            totalWeight += weights[i];
        });

        smoothedHeading /= totalWeight;

        // Allow larger heading changes when speed is higher
        const maxChange = Math.min(this.maxHeadingChange * (1 + speed/2), 120);
        
        // Limit maximum heading change
        if (this.lastHeading !== null) {
            const headingDiff = smoothedHeading - this.lastHeading;
            if (Math.abs(headingDiff) > maxChange) {
                smoothedHeading = this.lastHeading + 
                    (maxChange * Math.sign(headingDiff));
            }
        }

        // Normalize back to 0-360 range
        return (smoothedHeading + 360) % 360;
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

        // Skip update if too soon, unless it's first location or unpausing
        if (!this.isFirstLocation && 
            !this.wasJustUnpaused && 
            timeSinceLastUpdate < dynamicInterval) {
            return;
        }

        // Skip if accuracy is very poor
        if (geoPoint.accuracy > this.maxAccuracy) {
            console.log('Skipping update due to poor accuracy:', geoPoint.accuracy);
            return;
        }

        this.currentLocation = geoPoint;
        this.lastUpdateTime = currentTime;

        // Add new location to the list for heading calculation
        this.previousLocations.push(geoPoint);
        if (this.previousLocations.length > this.headingPoints) {
            this.previousLocations.shift();
        }

        // Calculate smoothed heading
        const heading = this.calculateSmoothedHeading(
            this.previousLocations,
            geoPoint
        );
        
        if (heading !== null) {
            this.lastHeading = heading;
            geoPoint.heading = heading;
        }

        // Update the location source
        if (this.mapInstance.getSource('location')) {
            this.mapInstance.getSource('location').setData(geoPoint.toGeoJSON());

            // Always animate to new position with zoom
            this.isAnimating = true;
            
            // Adjust animation duration based on speed
            const animDuration = speed < this.speedThresholds.walking 
                ? this.animationDuration 
                : Math.min(this.animationDuration, dynamicInterval * 0.8);
            
            this.mapInstance.flyTo({
                center: geoPoint.toArray(),
                zoom: this.zoomLevel,
                bearing: heading || 0,
                duration: animDuration,
                essential: true
            });
            
            setTimeout(() => {
                this.isAnimating = false;
            }, animDuration);

            this.wasJustUnpaused = false;
            this.isFirstLocation = false;
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
        this.wasJustUnpaused = true;
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
            console.log(`Retrying location watch (attempt ${this.currentRetry} of ${this.maxRetries})...`);
            
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