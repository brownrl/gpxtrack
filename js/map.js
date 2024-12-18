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
    // Track styling
    trackStyle: {
        lineColor: '#ff0000', // red
        lineWeight: 4,
        arrowConfig: {
            width: 24,
            height: 24,
            color: '#FFFFFF',  // Brighter color
            frequency: 4       // Draw arrow every Nth point
        }
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
    },

    /**
     * Update track visualization on the map
     * @param {Object} trackData - Track data including coordinates and direction points
     */
    updateTrackVisualization(trackData) {
        const { coordinates } = trackData;
        
        // Create and add track line
        const trackLine = {
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': coordinates
            }
        };

        this.addSource('track', {
            'type': 'geojson',
            'data': trackLine
        });

        this.addLayer({
            'id': 'track',
            'type': 'line',
            'source': 'track',
            'paint': {
                'line-color': this.trackStyle.lineColor,
                'line-width': this.trackStyle.lineWeight
            }
        });

        // Add direction indicators
        const directionPoints = this.createDirectionPoints(coordinates);
        this.mapInstance.addImage('direction-arrow', this.createArrowImage());
        
        this.addSource('track-directions', {
            'type': 'geojson',
            'data': directionPoints
        });

        this.addLayer({
            'id': 'track-directions',
            'type': 'symbol',
            'source': 'track-directions',
            'layout': {
                'icon-image': 'direction-arrow',
                'icon-rotate': ['get', 'bearing'],
                'icon-rotation-alignment': 'map',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
            }
        });

        // Fit map to track bounds
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach(coord => bounds.extend(coord));
        this.fitBounds(bounds, { padding: 50 });
    },

    /**
     * Clear track visualization from the map
     */
    clearTrackVisualization() {
        if (this.mapInstance.getLayer('track-directions')) {
            this.removeLayer('track-directions');
        }
        if (this.mapInstance.getSource('track-directions')) {
            this.removeSource('track-directions');
        }
        if (this.mapInstance.getLayer('track')) {
            this.removeLayer('track');
        }
        if (this.mapInstance.getSource('track')) {
            this.removeSource('track');
        }
    },

    /**
     * Creates an arrow image for direction indicators
     * @returns {ImageData} Arrow image data
     */
    createArrowImage() {
        const { width, height, color } = this.trackStyle.arrowConfig;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        
        // Draw arrow shape
        ctx.beginPath();
        ctx.moveTo(0, height/2);
        ctx.lineTo(width/2, 0);
        ctx.lineTo(width, height/2);
        ctx.lineTo(width/2, height);
        ctx.closePath();
        ctx.fill();
        
        return ctx.getImageData(0, 0, width, height);
    },

    /**
     * Creates direction points with bearings
     * @param {Array} coordinates - Array of track coordinates
     * @returns {Object} Direction points GeoJSON
     */
    createDirectionPoints(coordinates) {
        const { frequency } = this.trackStyle.arrowConfig;
        const features = [];
        
        for (let i = 0; i < coordinates.length - 1; i += frequency) {
            const point1 = coordinates[i];
            const point2 = coordinates[i + 1];
            if (!point2) continue;

            const bearing = this.app.geoUtils().calculateBearing(point1, point2);
            
            features.push({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': point1
                },
                'properties': {
                    'bearing': bearing
                }
            });
        }
        
        return {
            'type': 'FeatureCollection',
            'features': features
        };
    },

    /**
     * Get the track line color
     * @returns {string} Track line color
     */
    getTrackLineColor() {
        return this.trackStyle.lineColor;
    },

    /**
     * Get the track line weight
     * @returns {number} Track line weight
     */
    getTrackLineWeight() {
        return this.trackStyle.lineWeight;
    },

    /**
     * Update location visualization on the map
     * @param {GeoPoint} geoPoint - Position to update to
     * @param {number|null} heading - Optional heading in degrees
     * @param {Object} options - Animation options
     */
    updateLocationVisualization(geoPoint, heading, options = {}) {
        const {
            zoom = null,
            animate = true,
            duration = 1000
        } = options;

        // Update the location source
        if (this.mapInstance.getSource('location')) {
            this.mapInstance.getSource('location').setData(geoPoint.toGeoJSON());

            if (animate) {
                this.mapInstance.flyTo({
                    center: geoPoint.toArray(),
                    zoom: zoom !== null ? zoom : this.mapInstance.getZoom(),
                    bearing: heading !== null ? heading : this.mapInstance.getBearing(),
                    duration: duration,
                    essential: true
                });
            } else {
                this.mapInstance.setCenter(geoPoint.toArray());
                if (zoom !== null) this.mapInstance.setZoom(zoom);
                if (heading !== null) this.mapInstance.setBearing(heading);
            }
        }
    },

    /**
     * Setup location visualization on the map
     * @param {Object} options - Visualization options
     */
    setupLocationVisualization(options = {}) {
        const {
            circleRadius = 8,
            circleColor = '#007cbf'
        } = options;

        if (!this.mapInstance.getSource('location')) {
            this.mapInstance.addSource('location', {
                type: 'geojson',
                data: {
                    type: 'Point',
                    coordinates: [0, 0]
                }
            });

            this.mapInstance.addLayer({
                id: 'location',
                source: 'location',
                type: 'circle',
                paint: {
                    'circle-radius': circleRadius,
                    'circle-color': circleColor
                }
            });
        }
    }
};

export default map;
