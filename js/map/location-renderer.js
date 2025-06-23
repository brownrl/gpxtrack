/**
 * location-renderer.js
 * Handles location visualization on the map - separate from core map functionality
 */

import config from '../core/config.js';

class LocationRenderer {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.mapInstance = null;
        this.isLocationVisible = false;
        this.hasReceivedFirstLocation = false; // Track if we've received first location
        this.currentZoomOffset = 0; // Track current zoom offset
        this.previousLocation = null; // Store previous location for heading calculation
        this.currentHeading = null; // Current calculated heading

        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventBus.on('map:style-loaded', this.handleMapStyleLoaded, this);
        this.eventBus.on('location:updated', this.handleLocationUpdated, this);
        this.eventBus.on('location:clear-requested', this.clearLocationVisualization, this);
        this.eventBus.on('location:tracking-stopped', this.handleTrackingStopped, this);
        this.eventBus.on('map:zoom-changed', this.handleZoomChanged, this);
    }

    /**
     * Handle map style loaded
     * @param {Object} data - Contains map instance
     */
    handleMapStyleLoaded(data) {
        this.mapInstance = data.mapInstance;
        this.setupLocationVisualization();
    }    /**
     * Handle location updated
     * @param {Object} data - Location data
     */
    handleLocationUpdated(data) {
        const { location } = data; // Ignore device heading, we'll calculate our own
        
        // Calculate heading from GPS movement
        const calculatedHeading = this.calculateHeadingFromMovement(this.previousLocation, location);
        
        // Update heading if we calculated a new one
        if (calculatedHeading !== null) {
            this.currentHeading = calculatedHeading;
        }
        
        // Update visualization and fly to location
        this.updateLocationVisualizationAndFlyTo(location, this.currentHeading);
        
        // Store current location as previous for next calculation
        this.previousLocation = location;
        
        // Mark that we've received first location for other logic
        if (!this.hasReceivedFirstLocation && location) {
            this.hasReceivedFirstLocation = true;
        }
    }

    /**
     * Handle tracking stopped
     */
    handleTrackingStopped() {
        this.hasReceivedFirstLocation = false;
        this.lastValidHeading = null;
    }

    /**
     * Handle zoom level changes
     * @param {Object} data - Zoom data
     */
    handleZoomChanged(data) {
        // Store the zoom offset
        this.currentZoomOffset = data.zoomOffset || 0;

        // If we have a current location, update the view with new zoom
        this.eventBus.emit('location:refresh-requested');

        // Also request a map update with current view center and new zoom
        if (this.mapInstance) {
            const center = this.mapInstance.getCenter();
            const newZoom = config.map.defaultZoom + (data.zoomOffset || 0);

            this.eventBus.emit('map:fly-to-requested', {
                center: [center.lng, center.lat],
                zoom: newZoom
            });
        }
    }

    /**
     * Setup location visualization resources
     */
    setupLocationVisualization() {
        if (!this.mapInstance) return;

        // Add location source
        this.mapInstance.addSource('location', {
            type: 'geojson',
            data: {
                type: 'Point',
                coordinates: [0, 0]
            }
        });

        // Add location layer
        this.mapInstance.addLayer({
            'id': 'location',
            'source': 'location',
            'type': 'circle',
            'slot': 'locationSlot',
            'paint': {
                'circle-radius': config.location.style.circle.radius,
                'circle-color': config.location.style.circle.color,
                'circle-opacity': config.location.style.circle.opacity
            }
        });

        this.isLocationVisible = true;

        this.eventBus.emit('location:visualization-ready');
    }

    /**
     * Update location visualization and fly to location
     * @param {GeoPoint} location - Current location
     * @param {number|null} heading - Optional heading in degrees
     */
    updateLocationVisualizationAndFlyTo(location, heading = null) {
        if (!this.mapInstance || !location) return;

        // Update location source
        this.mapInstance.getSource('location').setData({
            type: 'Point',
            coordinates: [location.lng, location.lat]
        });

        // Keep track of last valid heading
        if (heading !== null && heading !== undefined) {
            this.lastValidHeading = heading;
        }

        // Fly to location with current zoom offset applied
        const flyToOptions = {
            center: [location.lng, location.lat],
            zoom: config.map.defaultZoom + this.currentZoomOffset,
            duration: config.location.animation.duration,
            essential: config.location.animation.essential
        };

        // Always use a heading if we have one (new or last valid)
        const bearingToUse = heading !== null && heading !== undefined ? heading : this.lastValidHeading;
        if (bearingToUse !== null && bearingToUse !== undefined) {
            flyToOptions.bearing = bearingToUse;
        }

        this.mapInstance.flyTo(flyToOptions);
    }

    /**
     * Update location visualization (for other purposes)
     * @param {GeoPoint} location - Current location
     * @param {number|null} heading - Optional heading in degrees
     */
    updateLocationVisualization(location, heading = null) {
        if (!this.mapInstance || !location) return;

        // Update location source
        this.mapInstance.getSource('location').setData({
            type: 'Point',
            coordinates: [location.lng, location.lat]
        });

        // Optionally handle heading visualization here
        // For now, we'll keep it simple with just the location point
    }

    /**
     * Clear location visualization
     */
    clearLocationVisualization() {
        if (!this.mapInstance) return;

        // Remove layer
        if (this.mapInstance.getLayer('location')) {
            this.mapInstance.removeLayer('location');
        }

        // Remove source
        if (this.mapInstance.getSource('location')) {
            this.mapInstance.removeSource('location');
        }

        this.isLocationVisible = false;
        this.hasReceivedFirstLocation = false; // Reset first location flag

        this.eventBus.emit('location:visualization-cleared');
    }

    /**
     * Check if location is currently visible
     * @returns {boolean} Whether location visualization is active
     */
    isVisible() {
        return this.isLocationVisible;
    }

    /**
     * Calculate heading from GPS movement (previous location to current location)
     * @param {GeoPoint} previousLoc - Previous location
     * @param {GeoPoint} currentLoc - Current location
     * @returns {number|null} Heading in degrees (0-360) or null if can't calculate
     */
    calculateHeadingFromMovement(previousLoc, currentLoc) {
        if (!previousLoc || !currentLoc) return null;

        // Calculate distance to ensure we have significant movement
        const distance = currentLoc.distanceTo(previousLoc);
        const minimumDistance = 4; // meters - same as config.location.tracking.minimumDistanceForHeadings

        if (distance < minimumDistance) {
            return null; // Not enough movement for reliable heading
        }

        // Calculate bearing from previous to current location
        const lon1 = previousLoc.lng * Math.PI / 180;
        const lat1 = previousLoc.lat * Math.PI / 180;
        const lon2 = currentLoc.lng * Math.PI / 180;
        const lat2 = currentLoc.lat * Math.PI / 180;

        const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
        
        let bearing = Math.atan2(y, x) * 180 / Math.PI;
        bearing = (bearing + 360) % 360; // Normalize to 0-360

        return bearing;
    }
}

export default LocationRenderer;
