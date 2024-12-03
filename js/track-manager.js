import locationTracker from './location-tracker.js';
import { calculateBearing, calculateDistance } from './utils.js';

// Track management functionality
const trackManager = {
    // Default properties for the track line and points
    trackLineColor: '#0066ff', // Blue
    trackLineWeight: 4,
    trackPointColor: '#0066ff', // Blue
    trackPointRadius: 5,
    trackPointWeight: 2,
    interpolationDistance: 50, // meters

    // Configuration for direction indicators
    arrowConfig: {
        width: 16,
        height: 24,
        color: '#AAAAAA',  // Brighter color
        indentFactor: 0.7,  // How deep the bottom indent goes (0-1)
        spacing: 200,       // Distance between arrows in pixels
        frequency: 4        // Draw arrow every Nth point
    },

    trackPoints: [],
    trackDistances: [],
    trackLine: null,
    directionMarkers: [],

    // Create arrow image for direction indicators
    createArrowImage: function() {
        const cfg = this.arrowConfig;
        const canvas = document.createElement('canvas');
        canvas.width = cfg.width;
        canvas.height = cfg.height;
        const ctx = canvas.getContext('2d');

        // Clear background to transparent
        ctx.clearRect(0, 0, cfg.width, cfg.height);

        // Draw a more arrow-like triangle
        ctx.beginPath();
        ctx.moveTo(cfg.width/2, 2);                    // Top point
        ctx.lineTo(cfg.width-2, cfg.height-2);         // Bottom right
        ctx.lineTo(cfg.width/2, cfg.height*cfg.indentFactor);  // Bottom middle indent
        ctx.lineTo(2, cfg.height-2);                   // Bottom left
        ctx.closePath();

        ctx.fillStyle = cfg.color;
        ctx.fill();

        return ctx.getImageData(0, 0, cfg.width, cfg.height);
    },

    // Calculate distance between two points using Haversine formula
    calculateDistance: calculateDistance,

    // Interpolate a point at a specific distance along a line segment
    interpolatePoint: function(point1, point2, fraction) {
        const [lon1, lat1] = point1;
        const [lon2, lat2] = point2;
        
        // Simple linear interpolation
        const lon = lon1 + (lon2 - lon1) * fraction;
        const lat = lat1 + (lat2 - lat1) * fraction;
        
        return [lon, lat];
    },

    // Add interpolated points to make sure there's a point every X meters
    interpolateTrackPoints: function(coordinates) {
        const interpolatedPoints = [];
        
        for (let i = 0; i < coordinates.length - 1; i++) {
            const point1 = coordinates[i];
            const point2 = coordinates[i + 1];
            
            interpolatedPoints.push(point1);
            
            const segmentDistance = this.calculateDistance(point1, point2);
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

    // Calculate cumulative distances for the track
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

    // Initialize track handling
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

                            // Create direction points with bearings
                            const directionPoints = this.createDirectionPoints(interpolatedCoordinates);

                            // Add arrow image to map
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
                            }); // Add as topmost layer

                            // Add track line source and layer
                            map.addSource('track', {
                                'type': 'geojson',
                                'data': this.trackLine
                            });
                            map.addLayer({
                                'id': 'track',
                                'type': 'line',
                                'source': 'track',
                                'paint': {
                                    'line-color': '#FF0000',
                                    'line-width': 3
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
                                padding: 50,
                                duration: 1000
                            });

                            // Wait for bounds animation to complete, then resume location tracking
                            map.once('moveend', () => {
                                // Wait 3 seconds before unpausing location tracking
                                setTimeout(() => {
                                    locationTracker.unpause(map);
                                }, 3000);
                            });

                            // Show clear button
                            document.querySelector('.clear-button').style.display = 'inline-block';

                            // Show progress display when a track is loaded
                            document.getElementById('progress-display').style.display = 'block';
                        }
                    }
                };
                reader.readAsText(file);
            }
        });
    },

    // Function to clear the track
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
        document.querySelector('.clear-button').style.display = 'none';

        // Hide progress display when clearing the track
        const progressElement = document.getElementById('progress-display');
        if (progressElement) {
            progressElement.textContent = '';
        }
    },

    // Create direction points with bearings
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