import trackManager from './track-manager.js';
import progressTracker from './progress-tracker.js';
import { calculateBearing, calculateDistance } from './utils.js';

// Location tracking functionality
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
    maxRotationThreshold: 120, // Maximum degrees of change for normal animation duration
    circleRadius: 8,
    circleColor: '#0066ff',

    // Methods to update circle appearance
    setCircleRadius: function(radius) {
        this.circleRadius = radius;
        return this;
    },

    setCircleColor(color) {
        this.circleColor = color;
        return this;
    },

    onLocationUpdate: function(position, map) {
        const { longitude, latitude } = position.coords;
        console.log('Location update:', latitude, longitude);
        
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
            console.log('Updating map location and center');
            
            // Update the location dot
            map.getSource('location').setData({
                type: 'Point',
                coordinates: [longitude, latitude]
            });

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
            
            // Store this location as our last update point
            this.lastMapUpdateLocation = newLocation;
        }

        // Update progress
        progressTracker.updateProgress(newLocation, map);
    },

    getCurrentLocation: function() {
        return this.currentLocation;
    },

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
    }
};

export default locationTracker;