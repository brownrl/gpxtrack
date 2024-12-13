/**
 * track-manager.js
 * Manages GPX track loading, display, and interaction.
 */

const trackManager = {
    // Default properties for the track line and points
    trackLineColor: '#ff0000', // red
    trackLineWeight: 4,
    interpolationDistance: 50, // meters
    locationTrackerResumeDelay: 5000, // milliseconds
    
    // Component references
    app: null,
    map: null,
    mapInstance: null,
    locationTracker: null,
    geoUtils: null,
    progressTracker: null,

    // Configuration for direction indicators
    arrowConfig: {
        width: 24,
        height: 24,
        color: '#FFFFFF',  // Brighter color
        frequency: 4        // Draw arrow every Nth point
    },

    trackPoints: [],
    trackDistances: [],
    trackLine: null,
    directionMarkers: [],

    /**
     * Initialize with app reference and setup track handling
     * @param {Object} app - The app mediator
     */
    init(app) {
        this.app = app;
        this.map = app.map();
        this.mapInstance = this.map.getInstance();
        this.locationTracker = app.locationTracker();
        this.geoUtils = app.geoUtils();
        this.progressTracker = app.progressTracker();
        this.setupFileInput();
    },

    /**
     * Sets up the GPX file input handler
     */
    setupFileInput() {
        const fileInput = document.getElementById('gpx-file');
        fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
    },

    /**
     * Handles GPX file selection
     * @param {Event} e - File input change event
     */
    async handleFileSelection(e) {
        const file = e.target.files[0];
        if (!file) return;

        const fileInput = e.target;
        fileInput.value = ''; // Reset file input

        try {
            const gpxContent = await this.readGPXFile(file);
            await this.processGPXTrack(gpxContent);
        } catch (error) {
            console.error('Error processing GPX file:', error);
        }
    },

    /**
     * Reads a GPX file and returns its content
     * @param {File} file - GPX file to read
     * @returns {Promise<string>} File content
     */
    readGPXFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsText(file);
        });
    },

    /**
     * Processes GPX track data and updates the map
     * @param {string} gpxContent - GPX file content
     */
    async processGPXTrack(gpxContent) {
        this.clearTrack();

        // Parse GPX to GeoJSON
        const gpx = new DOMParser().parseFromString(gpxContent, 'text/xml');
        const converted = toGeoJSON.gpx(gpx);

        if (!converted.features.length) return;

        const coordinates = converted.features[0].geometry.coordinates;
        if (!coordinates.length) return;

        // Process track data
        const interpolatedCoordinates = this.interpolateTrackPoints(coordinates);
        this.trackPoints = interpolatedCoordinates;
        this.calculateTrackDistances();

        // Update map layers
        await this.updateMapLayers(interpolatedCoordinates);
        
        // Update UI
        this.updateUI();
    },

    /**
     * Updates map layers with track data
     * @param {Array} coordinates - Track coordinates
     */
    async updateMapLayers(coordinates) {
        const map = this.mapInstance;
        
        // Create track line
        this.trackLine = {
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': coordinates
            }
        };

        // Add track line layer
        map.addSource('track', {
            'type': 'geojson',
            'data': this.trackLine
        });
        map.addLayer({
            'id': 'track',
            'type': 'line',
            'source': 'track',
            'paint': {
                'line-color': this.trackLineColor,
                'line-width': this.trackLineWeight
            }
        });

        // Add direction indicators
        const directionPoints = this.createDirectionPoints(coordinates);
        map.addImage('direction-arrow', this.createArrowImage());
        map.addSource('track-directions', {
            'type': 'geojson',
            'data': directionPoints
        });
        map.addLayer({
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
        this.locationTracker.pause();  // Pause before fitting bounds

        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach(coord => bounds.extend(coord));
        
        map.fitBounds(bounds, { padding: 50 });

        // Udate the UI
        this.updateUI();

        // Resume location tracking after delay
        setTimeout(() => {
            this.locationTracker.unpause();
        }, this.locationTrackerResumeDelay);
    },

    /**
     * Updates UI elements after track processing
     */
    updateUI() {
        const uiControls = this.app.uiControls();
        const progressTracker = this.progressTracker;
        uiControls.showClearButton();
        progressTracker.showProgressDisplay();
    },

    /**
     * Clears the current track from the map
     */
    clearTrack() {
        const map = this.mapInstance;
        
        // Remove layers and sources
        ['track', 'track-directions'].forEach(id => {
            if (map.getLayer(id)) {
                map.removeLayer(id);
            }
            if (map.getSource(id)) {
                map.removeSource(id);
            }
        });

        // Remove direction arrow image
        if (map.hasImage('direction-arrow')) {
            map.removeImage('direction-arrow');
        }

        // Reset track data
        this.trackPoints = [];
        this.trackDistances = [];
        this.trackLine = null;

        // Update UI
        const uiControls = this.app.uiControls();
        const progressTracker = this.progressTracker;
        uiControls.hideClearButton();
        progressTracker.hideProgressDisplay();
    },

    /**
     * Creates an arrow image for direction indicators
     * @returns {ImageData} Arrow image data
     */
    createArrowImage() {
        const cfg = this.arrowConfig;
        const canvas = document.createElement('canvas');
        canvas.width = cfg.width;
        canvas.height = cfg.height;
        const ctx = canvas.getContext('2d');

        // Clear background
        ctx.clearRect(0, 0, cfg.width, cfg.height);

        // Draw the ^ character
        ctx.fillStyle = cfg.color;
        ctx.font = `${Math.floor(cfg.width * 0.8)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('^', cfg.width/2, cfg.height/2);

        return ctx.getImageData(0, 0, cfg.width, cfg.height);
    },

    /**
     * Adds interpolated points to make sure there's a point every X meters
     * @param {Array} coordinates - Array of track coordinates
     * @returns {Array} Interpolated track coordinates
     */
    interpolateTrackPoints(coordinates) {
        const interpolatedPoints = [];
        
        for (let i = 0; i < coordinates.length - 1; i++) {
            const point1 = coordinates[i];
            const point2 = coordinates[i + 1];
            
            interpolatedPoints.push(point1);
            
            const point1Obj = { lat: point1[1], lng: point1[0] };
            const point2Obj = { lat: point2[1], lng: point2[0] };
            const segmentDistance = this.geoUtils.calculateDistance(point1Obj, point2Obj);
            
            if (segmentDistance > this.interpolationDistance) {
                // Calculate how many points we need to add
                const numPoints = Math.floor(segmentDistance / this.interpolationDistance);
                
                for (let j = 1; j < numPoints; j++) {
                    const fraction = j / numPoints;
                    const newPoint = this.geoUtils.interpolatePoint(point1, point2, fraction);
                    interpolatedPoints.push([newPoint.lng, newPoint.lat]);
                }
            }
        }
        
        // Don't forget to add the last point
        interpolatedPoints.push(coordinates[coordinates.length - 1]);
        
        return interpolatedPoints;
    },

    /**
     * Calculates cumulative distances for the track
     */
    calculateTrackDistances() {
        this.trackDistances = [0];  // First point starts at 0
        let cumulativeDistance = 0;

        for (let i = 1; i < this.trackPoints.length; i++) {
            const point1 = { lat: this.trackPoints[i-1][1], lng: this.trackPoints[i-1][0] };
            const point2 = { lat: this.trackPoints[i][1], lng: this.trackPoints[i][0] };
            const distance = this.geoUtils.calculateDistance(point1, point2);
            cumulativeDistance += distance;
            this.trackDistances.push(cumulativeDistance);
        }
    },

    /**
     * Creates direction points with bearings
     * @param {Array} coordinates - Array of track coordinates
     * @returns {Object} Direction points GeoJSON
     */
    createDirectionPoints(coordinates) {
        const features = [];
        const freq = this.arrowConfig.frequency;

        for (let i = 0; i < coordinates.length - 1; i += freq) {
            const point1 = { lat: coordinates[i][1], lng: coordinates[i][0] };
            const point2 = { lat: coordinates[i + 1][1], lng: coordinates[i + 1][0] };
            const bearing = this.geoUtils.calculateBearing(point1, point2);

            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: coordinates[i]
                },
                properties: {
                    bearing: bearing
                }
            });
        }

        return {
            type: 'FeatureCollection',
            features: features
        };
    }
};

export default trackManager;