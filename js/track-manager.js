/**
 * track-manager.js
 * Manages GPX track loading, display, and interaction.
 */

import GeoPoint from './geo-point.js';

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
    trackLine: null,
    directionMarkers: [],
    trackIsLoaded: false,

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
        this.trackPoints = interpolatedCoordinates.map(coord => GeoPoint.fromArray(coord));
        this.calculateTrackDistances();

        // Update map layers
        await this.updateMapLayers(this.trackPoints.map(point => point.toArray()));
        
        // Update UI
        this.updateUI();
        this.trackIsLoaded = true;
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

        // Resume location tracking after delay
        setTimeout(() => {
            this.locationTracker.resume();
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
        this.trackLine = null;
        this.trackIsLoaded = false;

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
        let cumulativeDistance = 0;
        const totalDistance = this.calculateTotalDistance();

        // Calculate distances from start and remaining distances
        for (let i = 0; i < this.trackPoints.length; i++) {
            if (i > 0) {
                const point1 = this.trackPoints[i-1].toLatLng();
                const point2 = this.trackPoints[i].toLatLng();
                const distance = this.geoUtils.calculateDistance(point1, point2);
                cumulativeDistance += distance;
            }
            
            this.trackPoints[i].distanceFromStart = cumulativeDistance;
            this.trackPoints[i].remainingDistance = totalDistance - cumulativeDistance;
        }
    },

    /**
     * Calculates the total distance of the track
     * @returns {number} Total distance in meters
     */
    calculateTotalDistance() {
        let totalDistance = 0;
        for (let i = 1; i < this.trackPoints.length; i++) {
            const point1 = this.trackPoints[i-1].toLatLng();
            const point2 = this.trackPoints[i].toLatLng();
            totalDistance += this.geoUtils.calculateDistance(point1, point2);
        }
        return totalDistance;
    },

    /**
     * Gets the total track distance in meters
     * @returns {number} Total track distance in meters, or 0 if no track is loaded
     */
    getTotalDistance() {
        if (!this.hasTrack()) {
            return 0;
        }
        return this.trackPoints[this.trackPoints.length - 1].distanceFromStart;
    },

    /**
     * Gets the distance covered up to a specific track point
     * @param {number} pointIndex - Index of the track point
     * @returns {number} Distance covered in meters up to this point, or 0 if index is invalid
     */
    getDistanceCovered(pointIndex) {
        if (!this.hasTrack() || pointIndex < 0 || pointIndex >= this.trackPoints.length) {
            return 0;
        }
        return this.trackPoints[pointIndex].distanceFromStart;
    },

    /**
     * Gets the remaining distance from a specific track point to the end
     * @param {number} pointIndex - Index of the track point
     * @returns {number} Remaining distance in meters from this point to the end, or 0 if index is invalid
     */
    getRemainingDistance(pointIndex) {
        if (!this.hasTrack() || pointIndex < 0 || pointIndex >= this.trackPoints.length) {
            return 0;
        }
        return this.trackPoints[pointIndex].remainingDistance;
    },

    /**
     * Checks if a track is currently loaded
     * @returns {boolean} True if a track is loaded, false otherwise
     */
    hasTrack() {
        return this.trackIsLoaded;
    },

    /**
     * Finds the track point closest to the given location
     * @param {Object} location - Location object with lat/lng properties
     * @returns {Object|null} Object containing the closest point and its data, or null if no track is loaded
     */
    findClosestPoint(location) {
        if (!this.hasTrack()) {
            return null;
        }

        const closestIndex = this.findClosestPointIndex(location);
        if (closestIndex === -1) {
            return null;
        }
        
        const point = this.trackPoints[closestIndex];
        return {
            point: point.toLatLng(),
            index: closestIndex,
            distanceFromStart: point.distanceFromStart,
            remainingDistance: point.remainingDistance
        };
    },

    /**
     * Finds the index of the track point closest to the given location
     * @param {Object} location - Location object with lat/lng properties
     * @returns {number} Index of the closest track point, or -1 if no track is loaded
     */
    findClosestPointIndex(location) {
        if (!this.hasTrack()) {
            return -1;
        }

        let closestIndex = -1;
        let closestDistance = Infinity;

        this.trackPoints.forEach((point, index) => {
            const distance = this.geoUtils.calculateDistance(
                location,
                point.toLatLng()
            );
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        return closestIndex;
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