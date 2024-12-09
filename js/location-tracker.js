/**
 * location-tracker.js
 * 
 * This module handles real-time GPS location tracking and map updates.
 * It manages the user's location dot on the map, handles location updates,
 * and provides controls for pausing/resuming tracking.
 * 
 * Key Features:
 * - Real-time GPS tracking
 * - Smooth map animations for location updates
 * - Heading calculation based on movement
 * - Pause/Resume functionality
 * 
 * Configuration Properties:
 * @property {number} zoomLevel - Default zoom level for the map when tracking location
 * @property {number} headingPoints - Number of points to use for calculating heading
 * @property {number} minDistance - Minimum distance (meters) required between updates to trigger a map update
 * @property {number} circleRadius - Size of the location dot on the map
 * @property {string} circleColor - Color of the location dot (hex format)
 * @property {number} minRotationThreshold - Minimum degrees of change needed to rotate map
 * @property {number} maxRotationThreshold - Maximum degrees for normal animation duration
 * 
 * Important Notes:
 * 1. The location dot styling (circleRadius, circleColor) should not be modified
 *    as they are part of the app's visual design.
 * 2. Core tracking functionality (GPS updates, heading calculation) should be
 *    preserved to maintain accurate location tracking.
 * 3. The METER_PER_DEGREE constant is used for distance calculations and
 *    should not be changed.
 */

import trackManager from './track-manager.js';
import progressTracker from './progress-tracker.js';
import { calculateBearing, calculateDistance } from './utils.js';

/**
 * Location tracking functionality
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

    /**
     * Initializes location tracking on the map
     * @param {Object} map - Mapbox GL JS map instance
     */
    initLocationTracking: function(map) {
        this.map = map; // Store map reference
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
            heading = calculateBearing(lastPoint, newLocation);

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

        // Update progress display
        progressTracker.updateProgress(this.currentLocation, this.map);
    },

    /**
     * Pauses location tracking
     */
    pause: function() {
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
        this.initLocationTracking(this.map);
    },

    /**
     * Gets the current location
     * @returns {Object|null} Location object with lat/lng or null if not available
     */
    getCurrentLocation: function() {
        return this.currentLocation;
    },

    /**
     * Sets the circle radius
     * @param {number} radius - Radius of the circle
     * @returns {Object} this
     */
    setCircleRadius: function(radius) {
        this.circleRadius = radius;
        return this;
    },

    /**
     * Sets the circle color
     * @param {string} color - Color of the circle
     * @returns {Object} this
     */
    setCircleColor(color) {
        this.circleColor = color;
        return this;
    },

    /**
     * Checks if location tracking is paused
     * @returns {boolean} True if paused, false otherwise
     */
    isPaused: function() {
        return this.paused;
    }
};

export default locationTracker;