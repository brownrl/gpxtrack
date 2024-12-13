/**
 * location-tracker.js
 * 
 * This module handles real-time GPS location tracking and map updates.
 */

const locationTracker = {
    // Configuration
    paused: false,
    zoomLevel: 16,
    watchId: null,
    previousLocations: [], // Store the last locations for bearing calculation
    movementTolerance: 1, // meters
    headingPoints: 10,     // Number of points to use for heading calculation
    isAnimating: false,    // Track if we're currently animating
    animationDuration: 1000, // Duration in ms for animations
    lastMapUpdateLocation: null,
    minDistanceToUpdate: 5, // minimum distance in meters
    currentLocation: null, // Store current location
    forceNextUpdate: false, // Force update on next location after unpause
    lastHeading: null,     // Store last heading for smoothing
    minRotationThreshold: 15, // Minimum degrees of change needed to rotate map
    maxRotationThreshold: 120, // Maximum degrees for normal animation duration
    circleRadius: 8,
    circleColor: '#0066ff',
    map: null, // Store map reference
    app: null, // Reference to the app mediator

    /**
     * Initialize with app reference and start location tracking
     * @param {Object} app - The app mediator
     */
    init(app) {
        this.app = app;
        this.initLocationTracking();
    },

    /**
     * Initializes location tracking on the map
     */
    initLocationTracking() {
        this.map = this.app.map().getInstance();
        const map = this.map;
        
        // Setup location source and layer if they don't exist
        if (!map.getSource('location')) {
            map.addSource('location', {
                type: 'geojson',
                data: {
                    type: 'Point',
                    coordinates: [0, 0]
                }
            });
            map.addLayer({
                id: 'location',
                source: 'location',
                type: 'circle',
                paint: {
                    'circle-radius': this.circleRadius,
                    'circle-color': this.circleColor
                }
            });
        }

        // Start location tracking
        const handleError = (error) => {
            console.error('Location error:', error);
        };

        // Get initial position
        navigator.geolocation.getCurrentPosition(
            (position) => this.onLocationUpdate(position),
            handleError,
            { enableHighAccuracy: true }
        );

        // Start watching position
        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.onLocationUpdate(position),
            handleError,
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            }
        );
    },

    /**
     * Calculate bearing between two points
     */
    calculateBearing(point1, point2) {
        return this.app.geoUtils().calculateBearing(point1, point2);
    },

    /**
     * Updates the map with new location data
     * @param {Object} position - Position object with coords
     */
    onLocationUpdate: function(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        this.currentLocation = { lat: latitude, lng: longitude };

        // Add new location to the list
        const newLocation = { lng: longitude, lat: latitude };
        this.previousLocations.push(newLocation);
        if (this.previousLocations.length > this.headingPoints) {
            this.previousLocations.shift();
        }

        // Calculate heading if we have enough points
        let heading = null;
        if (this.previousLocations.length >= 2) {
            const lastPoint = this.previousLocations[this.previousLocations.length - 2];
            heading = this.calculateBearing(lastPoint, newLocation);

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
        }

        // Update the location source if it exists
        if (this.map.getSource('location')) {
            this.map.getSource('location').setData({
                type: 'Point',
                coordinates: [longitude, latitude]
            });

            // Animate the map movement
            if (!this.paused && !this.isAnimating) {
                this.isAnimating = true;
                this.map.flyTo({
                    center: [longitude, latitude],
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
        const progressTracker = this.app.progressTracker();
        progressTracker.updateProgress(this.currentLocation);
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

        // Remove the location layer and source if they exist
        if (this.map.getLayer('location')) {
            this.map.removeLayer('location');
        }
        if (this.map.getSource('location')) {
            this.map.removeSource('location');
        }
    },

    /**
     * Resumes location tracking
     */
    unpause() {
        this.paused = false;
        this.forceNextUpdate = true;
        this.initLocationTracking();
    },

    /**
     * Sets the circle radius
     * @param {number} radius - Radius of the circle
     * @returns {Object} this
     */
    setCircleRadius(radius) {
        this.circleRadius = radius;
        if (this.map && this.map.getLayer('location')) {
            this.map.setPaintProperty('location', 'circle-radius', radius);
        }
        return this;
    },

    /**
     * Sets the circle color
     * @param {string} color - Color of the circle
     * @returns {Object} this
     */
    setCircleColor(color) {
        this.circleColor = color;
        if (this.map && this.map.getLayer('location')) {
            this.map.setPaintProperty('location', 'circle-color', color);
        }
        return this;
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