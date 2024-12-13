/**
 * track-manager.js
 * Manages GPX track loading, display, and interaction.
 */

const trackManager = {
    // Default properties for the track line and points
    trackLineColor: '#ff0000', // red
    trackLineWeight: 4,
    interpolationDistance: 50, // meters
    app: null, // Reference to the app mediator

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
        this.initTrackHandling();
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
            const segmentDistance = this.app.geoUtils().calculateDistance(point1Obj, point2Obj);
            
            if (segmentDistance > this.interpolationDistance) {
                // Calculate how many points we need to add
                const numPoints = Math.floor(segmentDistance / this.interpolationDistance);
                
                for (let j = 1; j < numPoints; j++) {
                    const fraction = j / numPoints;
                    const newPoint = this.app.geoUtils().interpolatePoint(point1, point2, fraction);
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
            const distance = this.app.geoUtils().calculateDistance(point1, point2);
            cumulativeDistance += distance;
            this.trackDistances.push(cumulativeDistance);
        }
    },

    /**
     * Initializes track handling functionality
     */
    initTrackHandling() {
        const map = this.app.map().getInstance();
        const fileInput = document.getElementById('gpx-file');
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    this.clearTrack(map);

                    // Reset file input
                    fileInput.value = '';

                    // Pause location tracking
                    const locationTracker = this.app.locationTracker();
                    locationTracker.pause();

                    // Parse GPX
                    const gpx = new DOMParser().parseFromString(e.target.result, 'text/xml');
                    const converted = toGeoJSON.gpx(gpx);

                    // Process the track
                    if (converted.features.length > 0) {
                        const coordinates = converted.features[0].geometry.coordinates;

                        if (coordinates.length > 0) {
                            // Interpolate additional points
                            const interpolatedCoordinates = this.interpolateTrackPoints(coordinates);
                            
                            // Store track points
                            this.trackPoints = interpolatedCoordinates;

                            // Calculate track distances
                            this.calculateTrackDistances();

                            // Draw the track line
                            this.trackLine = {
                                'type': 'Feature',
                                'geometry': {
                                    'type': 'LineString',
                                    'coordinates': interpolatedCoordinates
                                }
                            };

                            // Add track line source and layer first
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

                            // Then add direction points with bearings
                            const directionPoints = this.createDirectionPoints(interpolatedCoordinates);

                            // Add arrow image and direction layer on top
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
                                    'icon-allow-overlap': true,
                                    'icon-ignore-placement': true
                                }
                            });

                            // Fit the map to the track bounds
                            const bounds = new mapboxgl.LngLatBounds();
                            interpolatedCoordinates.forEach(coord => bounds.extend(coord));
                            map.fitBounds(bounds, { padding: 50 });

                            // Show clear button and progress display
                            const uiControls = this.app.uiControls();
                            const progressTracker = this.app.progressTracker();
                            uiControls.showClearButton();
                            progressTracker.showProgressDisplay();

                            // Resume location tracking
                            locationTracker.unpause();
                        }
                    }
                };
                reader.readAsText(file);
            }
        });
    },

    /**
     * Clears the current track from the map
     * @param {Object} map - Mapbox GL JS map instance
     */
    clearTrack(map) {
        // Remove track layers and sources
        ['track-directions', 'track'].forEach(id => {
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

        // Clear track data
        this.trackPoints = [];
        this.trackDistances = [];
        this.trackLine = null;
        this.directionMarkers = [];

        // Hide clear button and progress display
        const uiControls = this.app.uiControls();
        const progressTracker = this.app.progressTracker();
        uiControls.hideClearButton();
        progressTracker.hideProgressDisplay();

        // Resume location tracking
        const locationTracker = this.app.locationTracker();
        locationTracker.unpause();
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
            const bearing = this.app.geoUtils().calculateBearing(point1, point2);

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