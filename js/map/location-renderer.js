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
        this.lastValidHeading = null; // Keep track of last valid heading

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
    }

    /**
     * Handle location updated
     * @param {Object} data - Location data
     */
    handleLocationUpdated(data) {
        const { location, heading } = data;
        this.updateLocationVisualizationAndFlyTo(location, heading);

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

        // Fly to location with current zoom offset applied
        const flyToOptions = {
            center: [location.lng, location.lat],
            zoom: config.map.defaultZoom + this.currentZoomOffset,
            duration: config.location.animation.duration,
            essential: config.location.animation.essential
        };

        // Add bearing (heading) if available - simple, like the old code
        if (heading !== null && heading !== undefined) {
            flyToOptions.bearing = heading;
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
}

export default LocationRenderer;
