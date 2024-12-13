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
    locationTimeout: 10000,
    previousLocations: [], // Store the last locations for bearing calculation
    headingPoints: 5,     // Reduced from 10 to 5 for more responsive turns
    minSpeed: 0.5,        // Minimum speed in m/s (1.8 km/h) to update heading
    maxHeadingChange: 45, // Maximum heading change per update in degrees
    headingWeights: [0.1, 0.15, 0.2, 0.25, 0.3], // Weights for last 5 points
    isAnimating: false,   // Track if we're currently animating
    animationDuration: 1000, // Duration in ms for animations
    lastHeading: null,    // Store last heading for smoothing
    minRotationThreshold: 15, // Minimum degrees of change needed to rotate map
    wasJustUnpaused: false, // Track if we just unpaused
    isFirstLocation: true, // Track if this is the first location update

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
     * Initializes location tracking
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

        this.isFirstLocation = true; // Reset first location flag
        this.previousLocations = []; // Clear previous locations
        this.lastHeading = null;     // Reset heading

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
            this.onLocationUpdate.bind(this),
            this.handleLocationError.bind(this),
            {
                enableHighAccuracy: true,
                timeout: this.locationTimeout,
                maximumAge: 0
            }
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

        // Calculate individual headings from recent points
        const headings = [];
        for (let i = 0; i < points.length - 1; i++) {
            const heading = this.geoUtils.calculateBearing(
                points[i].toLatLng(),
                points[i + 1].toLatLng()
            );
            headings.push(heading);
        }

        // Add current heading
        const currentHeading = this.geoUtils.calculateBearing(
            points[points.length - 1].toLatLng(),
            currentPoint.toLatLng()
        );
        headings.push(currentHeading);

        // Apply weighted average
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

        // Limit maximum heading change
        if (this.lastHeading !== null) {
            const headingDiff = smoothedHeading - this.lastHeading;
            if (Math.abs(headingDiff) > this.maxHeadingChange) {
                smoothedHeading = this.lastHeading + 
                    (this.maxHeadingChange * Math.sign(headingDiff));
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
        const geoPoint = GeoPoint.fromPosition(position);
        this.currentLocation = geoPoint;

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

            // Check if we should animate
            const shouldAnimate = !this.paused && 
                                !this.isAnimating && 
                                (this.isFirstLocation ||    // Always animate first location
                                 this.wasJustUnpaused ||    // Always animate after unpausing
                                 (heading !== null && geoPoint.speed >= this.minSpeed));

            if (shouldAnimate) {
                this.isAnimating = true;

                // For first location or unpausing, ensure we zoom to the proper level
                const targetZoom = (this.isFirstLocation || this.wasJustUnpaused) 
                    ? this.zoomLevel 
                    : this.mapInstance.getZoom();

                this.mapInstance.flyTo({
                    center: geoPoint.toArray(),
                    zoom: targetZoom,
                    bearing: heading || 0, // Use 0 if no heading when unpausing
                    duration: this.animationDuration,
                    essential: true
                });

                setTimeout(() => {
                    this.isAnimating = false;
                }, this.animationDuration);
                
                this.wasJustUnpaused = false;  // Reset the unpaused flag
                this.isFirstLocation = false;  // Reset the first location flag
            }
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
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    },

    /**
     * Resume location tracking
     */
    resume() {
        this.paused = false;
        this.wasJustUnpaused = true; // Set flag when unpausing
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
        console.error("Error getting location:", error);
    }
};

export default locationTracker;