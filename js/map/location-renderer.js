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
        const { location, heading } = data; // Now we trust the heading from data store

        // Defensive check for location object
        if (!location) {
            console.warn('LocationRenderer: Received empty location data');
            return;
        }

        // Update map position with new location and heading - LEGACY STYLE
        this.updateLocationVisualization(location, heading);

        // Store current location as previous for zoom updates
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
        this.previousLocation = null; // Reset for next tracking session
    }

    /**
     * Handle zoom level changes
     * @param {Object} data - Zoom data
     */
    handleZoomChanged(data) {
        // Store the zoom offset - LEGACY STYLE
        this.currentZoomOffset = data.zoomOffset || 0;

        // Trigger location update if we have a current location (like legacy updateMap call)
        if (this.previousLocation) {
            // Re-update with current location and no new heading calculation
            this.updateLocationVisualization(this.previousLocation, null);
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
     * Update location visualization on the map - LEGACY STYLE
     * @param {GeoPoint} geoPoint - Position to update to
     * @param {number|null} heading - Optional heading in degrees
     */
    updateLocationVisualization(geoPoint, heading) {
        if (!this.mapInstance || !geoPoint) return;

        // Update the location source
        if (this.mapInstance.getSource('location')) {
            this.mapInstance.getSource('location').setData({
                type: 'Point',
                coordinates: [geoPoint.lng, geoPoint.lat]
            });

            if (heading !== null) {
                this.mapInstance.flyTo({
                    center: [geoPoint.lng, geoPoint.lat],
                    zoom: config.map.defaultZoom + this.currentZoomOffset,
                    bearing: heading,
                    duration: config.location.animation.duration,
                    essential: config.location.animation.essential
                });
                return;
            }

            this.mapInstance.flyTo({
                center: [geoPoint.lng, geoPoint.lat],
                zoom: config.map.defaultZoom + this.currentZoomOffset,
                duration: config.location.animation.duration,
                essential: config.location.animation.essential
            });
        }
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
        this.previousLocation = null; // Reset previous location for heading calculation

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
