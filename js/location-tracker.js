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
    headingPoints: 10,     // Number of points to use for heading calculation
    isAnimating: false,    // Track if we're currently animating
    animationDuration: 1000, // Duration in ms for animations
    lastHeading: null,     // Store last heading for smoothing
    minRotationThreshold: 15, // Minimum degrees of change needed to rotate map

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

        // Start watching position with timeout
        const options = {
            enableHighAccuracy: true,
            timeout: this.locationTimeout,
            maximumAge: 0
        };

        if ("geolocation" in navigator) {
            this.watchId = navigator.geolocation.watchPosition(
                position => this.onLocationUpdate(position),
                error => console.error("Error getting location:", error),
                options
            );
        }
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

        // Calculate heading if we have enough points
        let heading = null;
        if (this.previousLocations.length >= 2) {
            const lastPoint = this.previousLocations[this.previousLocations.length - 2];
            heading = this.geoUtils.calculateBearing(lastPoint.toLatLng(), geoPoint.toLatLng());

            // Smooth heading changes
            if (this.lastHeading !== null) {
                const diff = Math.abs(heading - this.lastHeading);
                if (diff > 180) {
                    // If the difference is more than 180 degrees, we need to adjust
                    heading = diff > 270 ? heading + 360 : heading - 360;
                }
                heading = this.lastHeading * 0.7 + heading * 0.3;
                heading = (heading + 360) % 360;
            }
            this.lastHeading = heading;
            geoPoint.heading = heading;
        }

        // Update the location source
        if (this.mapInstance.getSource('location')) {
            this.mapInstance.getSource('location').setData(geoPoint.toGeoJSON());

            // Animate the map movement with rotation if not paused
            if (!this.paused && !this.isAnimating) {
                this.isAnimating = true;
                this.mapInstance.flyTo({
                    center: geoPoint.toArray(),
                    zoom: this.zoomLevel,
                    bearing: heading || 0,
                    duration: this.animationDuration,
                    essential: true
                });
                setTimeout(() => {
                    this.isAnimating = false;
                }, this.animationDuration);
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