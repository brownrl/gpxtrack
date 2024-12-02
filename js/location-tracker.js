import { createChevronIcon } from './chevron-utils.js';

// Location tracking functionality

// Default properties for location markers
const markerRadius = 5;
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
            // For iOS devices
            this.currentHeading = event.webkitCompassHeading;
        } else if (event.alpha !== null) {
            // For Android devices
            this.currentHeading = 360 - event.alpha;
        }
    },

    initLocationTracking: function(map) {
        this.requestPermissions();
        this.unpause(map);
    },

    onLocationFound: function(e, map) {
        if (!map || typeof map.addLayer !== 'function') {
            return;
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

        // Add heading chevron if heading is available
        if (this.currentHeading !== null) {
            this.headingMarker = L.marker(e.latlng, {
                icon: createChevronIcon(this.currentHeading),
                zIndexOffset: 1000  // Ensure chevron appears above circle
            }).addTo(map);
        }

        // Center map on position if we're tracking
        if (!this.paused) {
            map.setView(e.latlng, this.zoomLevel);
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

export default locationTracker;