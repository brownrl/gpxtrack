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
        this.map = this.app.map().getInstance();
        this.initLocationTracking();
    },

    /**
     * Initializes location tracking
     */
    initLocationTracking() {

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

        // Add new location to the list for heading calculation
        const newLocation = { lng: longitude, lat: latitude };
        this.previousLocations.push(newLocation);
        if (this.previousLocations.length > this.headingPoints) {
            this.previousLocations.shift();
        }

        // Calculate heading if we have enough points
        let heading = null;
        if (this.previousLocations.length >= 2) {
            const lastPoint = this.previousLocations[this.previousLocations.length - 2];
            heading = this.app.geoUtils().calculateBearing(lastPoint, newLocation);

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

        // Update the location source
        if (this.map.getSource('location')) {
            this.map.getSource('location').setData({
                type: 'Point',
                coordinates: [longitude, latitude]
            });

            // Animate the map movement with rotation if not paused
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