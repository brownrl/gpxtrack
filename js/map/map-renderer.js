/**
 * map-renderer.js
 * Core map functionality only - rendering and basic map operations
 */

import config from '../core/config.js';

class MapRenderer {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.mapInstance = null;
        this.zoomOffset = config.map.zoomOffset.default;
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventBus.on('map:init-requested', this.handleInitRequest, this);
        this.eventBus.on('map:zoom-requested', this.handleZoomRequest, this);
        this.eventBus.on('map:zoom-reset-requested', this.handleZoomResetRequest, this);
        this.eventBus.on('map:fit-bounds-requested', this.handleFitBoundsRequest, this);
        this.eventBus.on('map:fly-to-requested', this.handleFlyToRequest, this);
    }

    /**
     * Handle map initialization request
     */
    handleInitRequest() {
        this.initMap();
    }

    /**
     * Handle zoom request
     */
    handleZoomRequest() {
        this.cycleZoom();
    }

    /**
     * Handle zoom reset request
     */
    handleZoomResetRequest() {
        this.resetZoom();
    }

    /**
     * Handle fit bounds request
     * @param {Object} data - Contains bounds and options
     */
    handleFitBoundsRequest(data) {
        const { bounds, options = {} } = data;
        this.fitBounds(bounds, options);
    }

    /**
     * Handle fly to request
     * @param {Object} data - Contains center, zoom, bearing, etc.
     */
    handleFlyToRequest(data) {
        this.flyTo(data);
    }

    /**
     * Initialize the Mapbox map instance
     */
    initMap() {
        if (this.mapInstance) {
            console.warn('Map already initialized');
            return;
        }

        this.mapInstance = new mapboxgl.Map(config.map);

        // Setup map event listeners
        this.mapInstance.on('load', () => {
            this.eventBus.emit('map:loaded', {
                mapInstance: this.mapInstance
            });
        });

        this.mapInstance.on('style.load', () => {
            // Add slots for layered rendering
            this.mapInstance.addLayer({
                'id': 'trackAndDirectionsSlot',
                'type': 'slot',
            });
            this.mapInstance.addLayer({
                'id': 'locationSlot',
                'type': 'slot',
            });

            this.eventBus.emit('map:style-loaded', {
                mapInstance: this.mapInstance
            });
        });

        this.mapInstance.on('error', (error) => {
            this.eventBus.emit('map:error', { error });
        });

        return this.mapInstance;
    }

    /**
     * Cycle through zoom levels
     */
    cycleZoom() {
        this.zoomOffset += 1;
        if (this.zoomOffset > config.map.zoomOffset.max) {
            this.zoomOffset = config.map.zoomOffset.min;
        }

        this.eventBus.emit('map:zoom-changed', {
            zoomOffset: this.zoomOffset
        });
    }

    /**
     * Reset zoom to default
     */
    resetZoom() {
        this.zoomOffset = config.map.zoomOffset.default;
        this.eventBus.emit('map:zoom-changed', {
            zoomOffset: this.zoomOffset
        });
    }

    /**
     * Fit map view to bounds
     * @param {Object} bounds - LngLatBounds object
     * @param {Object} options - Fit bounds options
     */
    fitBounds(bounds, options = {}) {
        if (!this.mapInstance) return;

        this.mapInstance.fitBounds(bounds, options);
    }

    /**
     * Fly to a location
     * @param {Object} options - Fly to options (center, zoom, bearing, etc.)
     */
    flyTo(options) {
        if (!this.mapInstance) return;

        // Apply zoom offset if zoom is specified
        if (options.zoom !== undefined) {
            options.zoom += this.zoomOffset;
        }

        this.mapInstance.flyTo({
            duration: config.location.animation.duration,
            essential: config.location.animation.essential,
            ...options
        });
    }

    /**
     * Add a source to the map
     * @param {string} id - Source ID
     * @param {Object} source - Source configuration
     */
    addSource(id, source) {
        if (!this.mapInstance) return;

        if (!this.mapInstance.getSource(id)) {
            this.mapInstance.addSource(id, source);
        }
    }

    /**
     * Update source data
     * @param {string} id - Source ID
     * @param {Object} data - New data for the source
     */
    updateSource(id, data) {
        if (!this.mapInstance) return;

        const source = this.mapInstance.getSource(id);
        if (source && source.setData) {
            source.setData(data);
        }
    }

    /**
     * Add a layer to the map
     * @param {Object} layer - Layer configuration
     */
    addLayer(layer) {
        if (!this.mapInstance) return;

        if (!this.mapInstance.getLayer(layer.id)) {
            this.mapInstance.addLayer(layer);
        }
    }

    /**
     * Remove a layer from the map
     * @param {string} id - Layer ID
     */
    removeLayer(id) {
        if (!this.mapInstance) return;

        if (this.mapInstance.getLayer(id)) {
            this.mapInstance.removeLayer(id);
        }
    }

    /**
     * Remove a source from the map
     * @param {string} id - Source ID
     */
    removeSource(id) {
        if (!this.mapInstance) return;

        if (this.mapInstance.getSource(id)) {
            this.mapInstance.removeSource(id);
        }
    }

    /**
     * Add an image to the map
     * @param {string} id - Image ID
     * @param {ImageData} image - Image data
     */
    addImage(id, image) {
        if (!this.mapInstance) return;

        if (!this.mapInstance.hasImage(id)) {
            this.mapInstance.addImage(id, image);
        }
    }

    /**
     * Remove an image from the map
     * @param {string} id - Image ID
     */
    removeImage(id) {
        if (!this.mapInstance) return;

        if (this.mapInstance.hasImage(id)) {
            this.mapInstance.removeImage(id);
        }
    }

    /**
     * Get the map instance
     * @returns {Object} Mapbox map instance
     */
    getInstance() {
        return this.mapInstance;
    }

    /**
     * Get current zoom offset
     * @returns {number} Current zoom offset
     */
    getZoomOffset() {
        return this.zoomOffset;
    }
}

export default MapRenderer;
