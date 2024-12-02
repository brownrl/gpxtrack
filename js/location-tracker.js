import { createChevronIcon } from './chevron-utils.js';
import trackManager from './track-manager.js';

// Location tracking functionality

// Default properties for location markers
const markerRadius = 8; // Increased from 5
const markerColor = '#808080'; // Grey color
const markerFillColor = '#808080';
const markerFillOpacity = 1;

// Removed map dependency from locationTracker
const locationTracker = {
    paused: false,
    zoomLevel: 17,
    locationCircle: null,
    headingMarker: null,
    currentHeading: null,
    previousLocations: [], // Store the last three locations
    movementTolerance: 1, // meters

    requestPermissions: async function() {
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
                }
            } catch (error) {
                console.error('Error requesting device orientation permission:', error);
            }
        } else {
            // For devices that don't require permission
            window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
        }
    },

    handleOrientation: function(event) {
        if (event.webkitCompassHeading) {
            this.currentHeading = event.webkitCompassHeading;
        } else if (event.alpha !== null) {
            this.currentHeading = 360 - event.alpha;
        } else {
            this.currentHeading = 0; // Default to 0 degrees (North) if heading cannot be determined
        }
    },

    initLocationTracking: function(map) {
        this.unpause(map);

        // Add initial heading chevron
        if (!this.headingMarker) {
            this.headingMarker = L.marker([0, 0], {
                icon: createChevronIcon(0), // Default chevron pointing North
                zIndexOffset: 1000  // Ensure chevron appears above circle
            }).addTo(map);
        }
    },

    onLocationFound: function(e, map) {
        if (!map || typeof map.addLayer !== 'function') {
            return;
        }

        // Add new location to the list
        this.previousLocations.push(e.latlng);
        if (this.previousLocations.length > 3) {
            this.previousLocations.shift(); // Keep only the last three points
        }

        // Calculate average bearing if we have at least two previous points
        if (this.previousLocations.length >= 2) {
            let totalBearing = 0;
            for (let i = 0; i < this.previousLocations.length - 1; i++) {
                totalBearing += this.calculateBearing(this.previousLocations[i], this.previousLocations[i + 1]);
            }
            this.currentHeading = totalBearing / (this.previousLocations.length - 1);
        }

        // Remove previous markers
        if (this.locationCircle) {
            map.removeLayer(this.locationCircle);
        }
        if (this.headingMarker) {
            map.removeLayer(this.headingMarker);
        }

        // Add location circle
        this.locationCircle = L.circle(e.latlng, {
            radius: markerRadius,
            color: markerColor,
            fillColor: markerFillColor,
            fillOpacity: markerFillOpacity
        }).addTo(map);

        // Add heading chevron
        this.updateHeadingMarker(map, e.latlng);

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

    updateHeadingMarker: function(map, position) {
        if (!this.headingMarker) {
            this.headingMarker = L.marker(position, {
                icon: createChevronIcon(this.currentHeading || 0), // Use currentHeading or default to 0
                zIndexOffset: 1000  // Ensure chevron appears above circle
            });
        } else {
            this.headingMarker.setIcon(createChevronIcon(this.currentHeading || 0));
            this.headingMarker.setLatLng(position);
        }
        this.headingMarker.addTo(map);
    },

    calculateBearing: function(start, end) {
        const startLat = start.lat * Math.PI / 180;
        const startLng = start.lng * Math.PI / 180;
        const endLat = end.lat * Math.PI / 180;
        const endLng = end.lng * Math.PI / 180;

        const y = Math.sin(endLng - startLng) * Math.cos(endLat);
        const x = Math.cos(startLat) * Math.sin(endLat) -
                 Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
        
        // Add 270 degrees (90 + 180) to flip the chevron and account for its default right orientation
        return ((Math.atan2(y, x) * 180 / Math.PI) + 270) % 360;
    },

    onLocationError: function(e) {
        return;
    },

    pause: function(map) {
        this.paused = true;
        map.off('locationfound', this.onLocationFound);
        map.off('locationerror', this.onLocationError);
        map.stopLocate();
        window.removeEventListener('deviceorientation', this.handleOrientation);

        // Clean up markers
        if (this.locationCircle) {
            map.removeLayer(this.locationCircle);
            this.locationCircle = null;
        }
        if (this.headingMarker) {
            map.removeLayer(this.headingMarker);
            this.headingMarker = null;
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

function checkPWAStatus() {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const pwaWarning = document.getElementById('pwa-warning');
    if (!isPWA && pwaWarning) {
        pwaWarning.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', checkPWAStatus);

export default locationTracker;