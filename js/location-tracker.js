import trackManager from './track-manager.js';
import { calculateBearing } from './utils.js';

// Location tracking functionality
const locationTracker = {
    // Configuration
    paused: false,
    zoomLevel: 17,
    watchId: null,
    previousLocations: [], // Store the last locations for bearing calculation
    movementTolerance: 1, // meters

    // Location circle appearance
    circleRadius: 8,
    circleColor: '#007bff',

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
        if (this.previousLocations.length > 5) {
            this.previousLocations.shift();
        }

        // Update the location source if it exists
        if (map.getSource('location')) {
            map.getSource('location').setData({
                type: 'Point',
                coordinates: [longitude, latitude]
            });
        }

        // Update progress if we have a track
        this.updateProgress(map);

        // Center map on position if we're not paused
        if (!this.paused) {
            map.flyTo({ 
                center: [longitude, latitude], 
                zoom: this.zoomLevel 
            });
        }
    },

    updateProgress: function(map) {
        if (!trackManager.trackPoints || trackManager.trackPoints.length === 0 || this.previousLocations.length === 0) {
            return;
        }

        // Find the closest track point to the current location
        let closestIndex = 0;
        let closestDistance = Infinity;
        const currentLocation = this.previousLocations[this.previousLocations.length - 1];
        
        for (let i = 0; i < trackManager.trackPoints.length; i++) {
            const point1 = mapboxgl.MercatorCoordinate.fromLngLat(currentLocation);
            const point2 = mapboxgl.MercatorCoordinate.fromLngLat(trackManager.trackPoints[i]);
            const distance = point1.distanceTo(point2);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        }

        // Calculate remaining distance
        const totalDistance = trackManager.trackDistances[trackManager.trackDistances.length - 1];
        const remainingDistance = totalDistance - trackManager.trackDistances[closestIndex];

        // Display progress
        const progressElement = document.getElementById('progress-display');
        if (progressElement) {
            progressElement.textContent = `${(remainingDistance / 1000).toFixed(1)} km`;
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
        if (!map || typeof map.on !== 'function') {
            return;
        }

        this.paused = false;

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