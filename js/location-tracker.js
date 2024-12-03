import trackManager from './track-manager.js';
import progressTracker from './progress-tracker.js';
import { calculateBearing } from './utils.js';

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
    animationDuration: 500, // Duration in ms for animations
    needsInitialZoom: false, // Track if we need initial zoom

    // Location circle appearance
    circleRadius: 8,
    circleColor: '#0066ff',

    // Methods to update circle appearance
    setCircleRadius: function(radius) {
        this.circleRadius = radius;
        return this;
    },

    setCircleColor: function(color) {
        this.circleColor = color;
        return this;
    },

    initLocationTracking: function(map) {
        this.unpause(map);
    },

    onLocationUpdate: function(position, map) {
        const { longitude, latitude } = position.coords;
        
        // Add new location to the list
        const newLocation = { lng: longitude, lat: latitude };
        this.previousLocations.push(newLocation);
        if (this.previousLocations.length > this.headingPoints) {
            this.previousLocations.shift();
        }

        // Calculate average heading from recent points
        let heading = 0;
        if (this.previousLocations.length >= 2) {
            let totalBearing = 0;
            let bearingCount = 0;
            
            // Calculate bearings between consecutive points
            for (let i = 1; i < this.previousLocations.length; i++) {
                const prevPoint = this.previousLocations[i - 1];
                const currentPoint = this.previousLocations[i];
                
                const bearing = calculateBearing(prevPoint, currentPoint);
                totalBearing += bearing;
                bearingCount++;
            }
            
            // Calculate average bearing
            heading = totalBearing / bearingCount;
        }

        // Update the location source if it exists
        if (map.getSource('location')) {
            map.getSource('location').setData({
                type: 'Point',
                coordinates: [longitude, latitude]
            });
        }

        // Update progress
        progressTracker.updateProgress(newLocation, map);

        // Center map and rotate based on heading if we're not paused
        if (!this.paused && !this.isAnimating) {
            this.isAnimating = true;

            if (this.needsInitialZoom) {
                // First time after unpausing - do a flyTo with zoom
                map.flyTo({
                    center: [longitude, latitude],
                    zoom: this.zoomLevel,
                    bearing: heading,
                    duration: this.animationDuration,
                    easing: t => t * (2 - t) // Ease out quadratic
                });
                this.needsInitialZoom = false;
            } else {
                // Regular update - just pan and rotate
                map.panTo([longitude, latitude], {
                    duration: this.animationDuration,
                    easing: t => t * (2 - t)
                });

                map.rotateTo(heading, {
                    duration: this.animationDuration,
                    easing: t => t * (2 - t)
                });
            }

            // Reset animation flag after animations complete
            setTimeout(() => {
                this.isAnimating = false;
            }, this.animationDuration);
        }
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
        this.needsInitialZoom = true;

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