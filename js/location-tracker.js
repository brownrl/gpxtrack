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

    /**
     * Initializes location tracking on the map
     * @param {Object} map - Mapbox GL JS map instance
     */
    initLocationTracking: function(map) {
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
            (position) => this.onLocationUpdate(position, map),
            handleError,
            { enableHighAccuracy: true }
        );

        // Start watching position
        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.onLocationUpdate(position, map),
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
     * @param {Object} map - Mapbox GL JS map instance
     */
    onLocationUpdate: function(position, map) {
        const { longitude, latitude } = position.coords;
        
        // Add new location to the list
        const newLocation = { lng: longitude, lat: latitude };
        this.currentLocation = { lat: latitude, lng: longitude }; // Store current location
        
        // For simulation, we want to update more frequently
        let shouldUpdateMap = true;
        if (this.lastMapUpdateLocation) {
            const distance = calculateDistance(this.lastMapUpdateLocation, newLocation);
            // During simulation, use a smaller threshold
            shouldUpdateMap = distance >= 1; // 1 meter threshold for simulation
        }

        this.previousLocations.push(newLocation);
        if (this.previousLocations.length > this.headingPoints) {
            this.previousLocations.shift();
        }

        // Calculate heading from recent points
        let heading = 0;
        if (this.previousLocations.length >= 2) {
            let validBearings = [];
            
            // First pass: collect valid bearings
            for (let i = 1; i < this.previousLocations.length; i++) {
                const prevPoint = this.previousLocations[i - 1];
                const currentPoint = this.previousLocations[i];
                const bearing = calculateBearing(prevPoint, currentPoint);
                
                if (validBearings.length === 0) {
                    validBearings.push({ bearing, weight: i });
                    continue;
                }

                const avgBearing = validBearings.reduce((sum, b) => sum + b.bearing, 0) / validBearings.length;
                let bearingDiff = Math.abs(bearing - avgBearing);
                if (bearingDiff > 180) {
                    bearingDiff = 360 - bearingDiff;
                }

                const distance = calculateDistance(prevPoint, currentPoint);
                const maxAllowedDiff = Math.min(90, 45 + (distance * 10));
                
                if (bearingDiff <= maxAllowedDiff) {
                    validBearings.push({ bearing, weight: i });
                }
            }
            
            if (validBearings.length > 0) {
                let weightedBearing = 0;
                let totalWeight = 0;
                
                for (const {bearing, weight} of validBearings) {
                    weightedBearing += bearing * weight;
                    totalWeight += weight;
                }
                
                heading = weightedBearing / totalWeight;
                heading = (heading + 360) % 360;
            }
        }

        // Update the location source if it exists and we should update
        if (map.getSource('location') && shouldUpdateMap) {
            this.updateLocation(latitude, longitude);
            this.updateMapLocationAndCenter(map, longitude, latitude, heading);
            
            // Store this location as our last update point
            this.lastMapUpdateLocation = newLocation;
        }

        // Update progress
        progressTracker.updateProgress(newLocation, map);
    },

    updateLocation: function(latitude, longitude) {
        // Update the location dot
        this.map.getSource('location').setData({
            type: 'Point',
            coordinates: [longitude, latitude]
        });
    },

    updateMapLocationAndCenter: function(map, longitude, latitude, heading) {
        // Animate the map movement
        if (!this.paused && !this.isAnimating) {
            this.isAnimating = true;
            
            map.easeTo({
                center: [longitude, latitude],
                zoom: this.zoomLevel,
                bearing: heading,
                duration: 1000,
                easing: t => t * (2 - t), // Ease out quadratic
                essential: true // This animation is considered essential for the navigation
            });

            // Reset animation flag after animation completes
            setTimeout(() => {
                this.isAnimating = false;
            }, 1000);
        }
    },

    /**
     * Gets the current location
     * @returns {Object|null} Location object with lat/lng or null if not available
     */
    getCurrentLocation: function() {
        return this.currentLocation;
    },

    /**
     * Pauses location tracking
     * @param {Object} map - Mapbox GL JS map instance
     */
    pause: function(map) {
        this.paused = true;

        // Stop watching location
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        // Remove the location layer and source if they exist
        if (map.getLayer('location')) {
            map.removeLayer('location');
        }
        if (map.getSource('location')) {
            map.removeSource('location');
        }
    },

    /**
     * Resumes location tracking
     * @param {Object} map - Mapbox GL JS map instance
     */
    unpause: function(map) {
        this.paused = false;
        this.forceNextUpdate = true;

        const setupLocationTracking = () => {
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
                (position) => this.onLocationUpdate(position, map),
                handleError,
                { enableHighAccuracy: true }
            );

            // Start watching position
            this.watchId = navigator.geolocation.watchPosition(
                (position) => this.onLocationUpdate(position, map),
                handleError,
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 5000
                }
            );
        };

        // If the style is already loaded, setup tracking immediately
        if (map.isStyleLoaded()) {
            setupLocationTracking();
        } else {
            // Otherwise wait for the style to load
            map.once('style.load', setupLocationTracking);
        }
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