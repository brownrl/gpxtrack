/**
 * map.js
 * Core map component that manages the Mapbox map instance.
 */

const map = {
    // Configuration
    defaultConfig: {
        container: 'map',
        style: 'mapbox://styles/brownrl/cmc3e2a2j00ho01sdamtf6oc8',
        center: [10, 50], // Center over Europe
        zoom: 4, // Zoom level to show Europe
        interactive: false // Disable interactions by default
    },
    trackStyle: {
        lineColor: '#FF0000', // red
        lineWeight: 4,
        arrowConfig: {
            width: 24,
            height: 24,
            color: '#FFFFFF',  // Brighter color
            frequency: 4       // Draw arrow every Nth point
        }
    },
    locationStyle: {
        circle: {
            radius: 8,
            color: '#0088FF',
            opacity: 1
        },
        animation: {
            defaultZoom: 16,
            duration: 1000,
            essential: true
        }
    },

    // Component references
    app: null,
    mapInstance: null,
    locationTracker: null,

    // Runtime variables
    trackLine: null,

    zoomOffset: 0, // Default zoom level


    /**
     * Initialize the map component
     * @param {Object} app - Reference to the app mediator
     */
    init(app) {
        this.app = app;
        this.locationTracker = app.locationTracker();
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
     * Cycles through zoom levels
     * This method allows zooming in and out by cycling through predefined zoom levels.
     * It uses a zoom offset to adjust the zoom level dynamically.
     */
    zoom() {
        this.zoomOffset += 1;
        if (this.zoomOffset > 2) {
            this.zoomOffset = -2; // Limit zoom offset to 3
        }
        this.locationTracker.updateMap();
    },

    /**
     * Reset the zoom level to the default
     */
    resetZoom() {
        this.zoomOffset = 0;
        this.locationTracker.updateMap();
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
            'slot': 'trackAndDirectionsSlot',
            'beforeId': 'location', // Ensure track is below location layer
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
            'slot': 'trackAndDirectionsSlot',
            'beforeId': 'location', // Ensure directions are above track line and below location
            'layout': {
                'icon-image': 'direction-arrow',
                'icon-rotate': ['get', 'bearing'],
                'icon-rotation-alignment': 'map',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
            }
        });

        // Fit map to track bounds
        // Uncomment the following lines if you want to fit the map to the track bounds
        // We do this to show the entire track on the map ideally so the user can see the full path
        // and make sure it is the track they want to visualize.
        // This is usefull when the user has a bunch of tracks with simular names in a folder.
        // However, we want SPEED!
        //const bounds = new mapboxgl.LngLatBounds();
        //coordinates.forEach(coord => bounds.extend(coord));

        // Pause location tracker while showing full track
        //this.locationTracker.pause();

        //this.fitBounds(bounds, { padding: 50 });

        // Resume location tracker after 5 seconds
        //setTimeout(() => {
        //    this.locationTracker.resume();
        //}, 4000);
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
        // Remove the direction arrow image
        if (this.mapInstance.hasImage('direction-arrow')) {
            this.mapInstance.removeImage('direction-arrow');
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
        ctx.font = `${height}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw the ^ character
        ctx.fillText('^', width / 2, height / 2);

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
     * Update location visualization on the map
     * @param {GeoPoint} geoPoint - Position to update to
     * @param {number|null} heading - Optional heading in degrees
     */
    updateLocationVisualization(geoPoint, heading) {

        // Update the location source
        if (this.mapInstance.getSource('location')) {
            this.mapInstance.getSource('location').setData(geoPoint.toGeoJSON());

            if (heading !== null) {
                this.mapInstance.flyTo({
                    center: geoPoint.toArray(),
                    zoom: this.locationStyle.animation.defaultZoom + this.zoomOffset,
                    bearing: heading,
                    duration: this.locationStyle.animation.duration,
                    essential: this.locationStyle.animation.essential
                });
                return;
            }

            this.mapInstance.flyTo({
                center: geoPoint.toArray(),
                zoom: this.locationStyle.animation.defaultZoom + this.zoomOffset,
                duration: this.locationStyle.animation.duration,
                essential: this.locationStyle.animation.essential
            });

        }
    },

    /**
     * Setup location visualization on the map
     */
    setupLocationVisualization() {


        if (!this.mapInstance.getSource('location')) {
            this.addSource('location', {
                type: 'geojson',
                data: {
                    type: 'Point',
                    coordinates: [0, 0]
                }
            });

            this.addLayer({
                'id': 'location',
                'source': 'location',
                'type': 'circle',
                'slot': 'locationSlot',
                'paint': {
                    'circle-radius': this.locationStyle.circle.radius,
                    'circle-color': this.locationStyle.circle.color,
                    'circle-opacity': this.locationStyle.circle.opacity
                }
            });
        }
    }
};

export default map;
