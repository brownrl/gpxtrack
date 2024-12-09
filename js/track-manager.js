/**
 * track-manager.js
 * Manages GPX track loading, display, and interaction.
 * 
 * Key features:
 * - Loads and parses GPX files
 * - Displays tracks on the map
 * - Manages track styling and visibility
 * - Handles track clearing and updates
 * - Calculates track statistics (distance, etc.)
 */

import locationTracker from './location-tracker.js';
import { calculateBearing, calculateDistance } from './utils.js';
import progressTracker from './progress-tracker.js';
import uiControls from './ui-controls.js';

/**
 * Track management functionality
 */
const trackManager = {
    // Default properties for the track line and points
    trackLineColor: '#ff0000', // red
    trackLineWeight: 4,
    interpolationDistance: 50, // meters

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
     * Creates an arrow image for direction indicators
     * @returns {ImageData} Arrow image data
     */
    createArrowImage: function() {
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
     * Interpolates a point at a specific distance along a line segment
     * @param {Array} point1 - Starting point coordinates [lon, lat]
     * @param {Array} point2 - Ending point coordinates [lon, lat]
     * @param {Number} fraction - Fraction of the distance to interpolate
     * @returns {Array} Interpolated point coordinates [lon, lat]
     */
    interpolatePoint: function(point1, point2, fraction) {
        const [lon1, lat1] = point1;
        const [lon2, lat2] = point2;
        
        // Simple linear interpolation
        const lon = lon1 + (lon2 - lon1) * fraction;
        const lat = lat1 + (lat2 - lat1) * fraction;
        
        return [lon, lat];
    },

    /**
     * Adds interpolated points to make sure there's a point every X meters
     * @param {Array} coordinates - Array of track coordinates
     * @returns {Array} Interpolated track coordinates
     */
    interpolateTrackPoints: function(coordinates) {
        const interpolatedPoints = [];
        
        for (let i = 0; i < coordinates.length - 1; i++) {
            const point1 = coordinates[i];
            const point2 = coordinates[i + 1];
            
            interpolatedPoints.push(point1);
            
            const segmentDistance = calculateDistance(point1, point2);
            if (segmentDistance > this.interpolationDistance) {
                // Calculate how many points we need to add
                const numPoints = Math.floor(segmentDistance / this.interpolationDistance);
                
                for (let j = 1; j < numPoints; j++) {
                    const fraction = j / numPoints;
                    const newPoint = this.interpolatePoint(point1, point2, fraction);
                    interpolatedPoints.push(newPoint);
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
    calculateTrackDistances: function() {
        this.trackDistances = [0];  // First point starts at 0
        let cumulativeDistance = 0;

        for (let i = 1; i < this.trackPoints.length; i++) {
            const distance = calculateDistance(
                this.trackPoints[i-1],
                this.trackPoints[i]
            );
            cumulativeDistance += distance;
            this.trackDistances.push(cumulativeDistance);
        }
    },

    /**
     * Initializes track handling functionality
     * @param {Object} map - Mapbox GL JS map instance
     * @param {Object} startIcon - Start icon
     * @param {Object} endIcon - End icon
     */
    initTrackHandling: function(map, startIcon, endIcon) {
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
                    locationTracker.pause(map);

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
                                type: 'geojson',
                                data: directionPoints
                            });
                            map.addLayer({
                                'id': 'track-directions',
                                'type': 'symbol',
                                'source': 'track-directions',
                                'layout': {
                                    'icon-image': 'direction-arrow',
                                    'icon-size': 1,
                                    'icon-rotate': ['get', 'bearing'],
                                    'icon-rotation-alignment': 'map',
                                    'icon-allow-overlap': true,
                                    'icon-ignore-placement': true
                                }
                            });

                            // Get all existing layers
                            const layers = map.getStyle().layers;
                            const topLayer = layers[layers.length - 1].id;

                            // First fit to track bounds
                            const bounds = interpolatedCoordinates.reduce((bounds, coord) => {
                                return bounds.extend(coord);
                            }, new mapboxgl.LngLatBounds(interpolatedCoordinates[0], interpolatedCoordinates[0]));
                            
                            map.fitBounds(bounds, {
                                padding: { top: 50, bottom: 50, left: 50, right: 50 }
                            });

                            // After bounds fit, wait 3 seconds then unpause location tracking
                            setTimeout(() => {
                                locationTracker.unpause(map);
                            }, 3000);

                            // Enable UI controls and progress display
                            uiControls.showClearButton();
                            progressTracker.showProgressDisplay();
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
    clearTrack: function(map) {
        if (!map) return;

        // Clear track line
        if (map.getLayer('track')) {
            map.removeLayer('track');
        }
        if (map.getSource('track')) {
            map.removeSource('track');
        }
        this.trackLine = null;
        
        // Clear direction arrows
        if (map.getLayer('track-directions')) {
            map.removeLayer('track-directions');
        }
        if (map.getSource('track-directions')) {
            map.removeSource('track-directions');
        }

        // Remove arrow image
        if (map.hasImage('direction-arrow')) {
            map.removeImage('direction-arrow');
        }

        // Reset track data
        this.trackPoints = [];
        this.trackDistances = [];

        // Hide clear button
        uiControls.hideClearButton();

        // Hide progress display when clearing the track
        progressTracker.hideProgressDisplay();
    },

    /**
     * Creates direction points with bearings
     * @param {Array} coordinates - Array of track coordinates
     * @returns {Object} Direction points GeoJSON
     */
    createDirectionPoints: function(coordinates) {
        return {
            type: 'FeatureCollection',
            features: coordinates
                .filter((_, i) => i % this.arrowConfig.frequency === 0)  // Only keep every Nth point
                .map((coord, i, filteredCoords) => {
                    // Find the original index in the full coordinates array
                    const originalIndex = i * this.arrowConfig.frequency;
                    
                    // Calculate bearing to the immediate next point
                    let bearing = 0;
                    if (originalIndex < coordinates.length - 1) {
                        const nextCoord = coordinates[originalIndex + 1];
                        
                        // Convert coordinates to {lat, lng} objects
                        bearing = calculateBearing(
                            { lat: coord[1], lng: coord[0] },      // current point
                            { lat: nextCoord[1], lng: nextCoord[0] } // next point
                        );
                    }
                    
                    return {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: coord
                        },
                        properties: {
                            bearing: bearing
                        }
                    };
                })
        };
    },
};

export default trackManager;