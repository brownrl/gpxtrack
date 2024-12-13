/**
 * map.js
 * Core map component that manages the Mapbox map instance.
 */

const map = {
    // Configuration
    mapInstance: null,
    defaultConfig: {
        container: 'map',
        style: 'mapbox://styles/brownrl/cm48cuxe6014o01si62vr078z',
        center: [10, 50], // Center over Europe
        zoom: 4, // Zoom level to show Europe
        interactive: false // Disable interactions by default
    },
    app: null,

    /**
     * Initialize the map component
     * @param {Object} app - Reference to the app mediator
     */
    init(app) {
        this.app = app;
        this.initMap();
    },

    /**
     * Initialize the Mapbox map instance
     */
    initMap() {
        this.mapInstance = new mapboxgl.Map(this.defaultConfig);
        return this.mapInstance;
    },

    /**
     * Get the map instance
     * @returns {Object} Mapbox map instance
     */
    getInstance() {
        return this.mapInstance;
    },

    /**
     * Set map center
     * @param {Array} center - [longitude, latitude]
     * @param {Object} options - Additional options like animation duration
     */
    setCenter(center, options = {}) {
        if (this.mapInstance) {
            this.mapInstance.setCenter(center, options);
        }
    },

    /**
     * Set map zoom level
     * @param {number} zoom - Zoom level
     * @param {Object} options - Additional options like animation duration
     */
    setZoom(zoom, options = {}) {
        if (this.mapInstance) {
            this.mapInstance.setZoom(zoom, options);
        }
    },

    /**
     * Enable/disable map interactions
     * @param {boolean} enabled - Whether interactions should be enabled
     */
    setInteractive(enabled) {
        if (this.mapInstance) {
            this.mapInstance.dragPan.enable();
            this.mapInstance.scrollZoom.enable();
            this.mapInstance.boxZoom.enable();
            this.mapInstance.dragRotate.enable();
            this.mapInstance.keyboard.enable();
            this.mapInstance.doubleClickZoom.enable();
            this.mapInstance.touchZoomRotate.enable();
        }
    },

    /**
     * Add a source to the map
     * @param {string} id - Source ID
     * @param {Object} source - Source configuration
     */
    addSource(id, source) {
        if (this.mapInstance && !this.mapInstance.getSource(id)) {
            this.mapInstance.addSource(id, source);
        }
    },

    /**
     * Add a layer to the map
     * @param {Object} layer - Layer configuration
     */
    addLayer(layer) {
        if (this.mapInstance && !this.mapInstance.getLayer(layer.id)) {
            this.mapInstance.addLayer(layer);
        }
    },

    /**
     * Remove a layer from the map
     * @param {string} id - Layer ID
     */
    removeLayer(id) {
        if (this.mapInstance && this.mapInstance.getLayer(id)) {
            this.mapInstance.removeLayer(id);
        }
    },

    /**
     * Remove a source from the map
     * @param {string} id - Source ID
     */
    removeSource(id) {
        if (this.mapInstance && this.mapInstance.getSource(id)) {
            this.mapInstance.removeSource(id);
        }
    },

    /**
     * Fit the map view to bounds
     * @param {Object} bounds - LngLatBounds object
     * @param {Object} options - Fit bounds options
     */
    fitBounds(bounds, options = {}) {
        if (this.mapInstance) {
            this.mapInstance.fitBounds(bounds, options);
        }
    }
};

export default map;
