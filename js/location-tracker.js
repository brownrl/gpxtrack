import trackManager from './track-manager.js';
import { calculateBearing } from './utils.js';

// Location tracking functionality

// Default properties for location markers
const markerRadius = 8; // Increased from 5
const markerColor = '#808080'; // Grey color
const markerFillColor = '#808080';
const markerFillOpacity = 1;

// Number of points to use for averaging the bearing
const averageBearingPoints = 5;

// Removed map dependency from locationTracker
const locationTracker = {
    paused: false,
    zoomLevel: 17,
    locationCircle: null,
    currentHeading: null,
    previousLocations: [], // Store the last three locations
    movementTolerance: 1, // meters

    initLocationTracking: function(map) {
        this.unpause(map);
    },

    onLocationFound: function(e, map) {
        if (!map || typeof map.addLayer !== 'function') {
            return;
        }

        // Add new location to the list
        this.previousLocations.push(e.latlng);
        if (this.previousLocations.length > averageBearingPoints) {
            this.previousLocations.shift(); // Keep only the last points defined by averageBearingPoints
        }

        // Calculate average bearing if we have at least two previous points
        if (this.previousLocations.length >= 2) {
            let totalBearing = 0;
            for (let i = 0; i < this.previousLocations.length - 1; i++) {
                totalBearing += calculateBearing(this.previousLocations[i], this.previousLocations[i + 1]);
            }
            this.currentHeading = totalBearing / (this.previousLocations.length - 1);
        }

        // Remove previous markers
        if (this.locationCircle) {
            map.removeLayer(this.locationCircle);
        }

        // Add location circle
        this.locationCircle = L.circle(e.latlng, {
            radius: markerRadius,
            color: markerColor,
            fillColor: markerFillColor,
            fillOpacity: markerFillOpacity
        }).addTo(map);

        // Update progress
        this.updateProgress(map);

        // Center map on position if we're tracking
        if (!this.paused) {
            map.setView(e.latlng, this.zoomLevel);
        }
    },

    updateProgress: function(map) {
        if (!trackManager.trackPoints || trackManager.trackPoints.length === 0) {
            return;
        }

        // Find the closest track point to the current location
        let closestIndex = 0;
        let closestDistance = Infinity;
        for (let i = 0; i < trackManager.trackPoints.length; i++) {
            const distance = map.distance(this.previousLocations[this.previousLocations.length - 1], trackManager.trackPoints[i]);
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

    onLocationError: function(e) {
        return;
    },

    pause: function(map) {
        this.paused = true;
        map.off('locationfound', this.onLocationFound);
        map.off('locationerror', this.onLocationError);
        map.stopLocate();

        // Clean up markers
        if (this.locationCircle) {
            map.removeLayer(this.locationCircle);
            this.locationCircle = null;
        }
    },

    unpause: function(map) {
        if (!map || typeof map.on !== 'function') {
            return;
        }

        this.paused = false;

        // Bind location events with proper context
        const boundLocationFound = (e) => this.onLocationFound(e, map);
        const boundLocationError = (e) => this.onLocationError(e);
        
        // Remove any existing listeners to prevent duplicates
        map.off('locationfound');
        map.off('locationerror');
        
        // Add new listeners
        map.on('locationfound', boundLocationFound);
        map.on('locationerror', boundLocationError);
        
        // Start location tracking with options
        map.locate({
            watch: true,
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
            setView: true,      // Automatically set the map view
            maxZoom: this.zoomLevel
        });
    }
};

export default locationTracker;