import locationTracker from './location-tracker.js';
import { calculateBearing, createChevronIcon } from './utils.js';

// Track management functionality
const trackManager = {
    // Default properties for the track line and points
    trackLineColor: '#0066ff', // Blue
    trackLineWeight: 4,
    trackPointColor: '#0066ff', // Blue
    trackPointRadius: 5,
    trackPointWeight: 2,
    interpolationDistance: 50, // meters

    trackPoints: [],
    trackLine: null,
    trackPointMarkers: [],
    directionMarkers: [],
    trackDistances: [], // Pre-calculated distances for each track point

    // Calculate distance between two points using Haversine formula
    calculateDistance: function(point1, point2) {
        const [lon1, lat1] = point1;
        const [lon2, lat2] = point2;
        
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // in meters
    },

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
        this.trackDistances = [0];
        
        for (let i = 1; i < this.trackPoints.length; i++) {
            const distance = this.calculateDistance(
                this.trackPoints[i - 1],
                this.trackPoints[i]
            );
            this.trackDistances.push(this.trackDistances[i - 1] + distance);
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

                            // Create direction points (every 4th point)
                            const directionPoints = {
                                'type': 'FeatureCollection',
                                'features': interpolatedCoordinates.filter((_, index) => index % 4 === 0)
                                    .map((coord, index) => {
                                        const nextPoint = interpolatedCoordinates[Math.min(index * 4 + 1, interpolatedCoordinates.length - 1)];
                                        const bearing = calculateBearing(
                                            [coord[1], coord[0]], // Convert to [lat, lng] for bearing calculation
                                            [nextPoint[1], nextPoint[0]]
                                        );
                                        return {
                                            'type': 'Feature',
                                            'geometry': {
                                                'type': 'Point',
                                                'coordinates': coord
                                            },
                                            'properties': {
                                                'bearing': bearing
                                            }
                                        };
                                    })
                            };

                            // Add track line source and layer
                            map.addSource('track', {
                                'type': 'geojson',
                                'data': this.trackLine
                            });

                            map.addLayer({
                                'id': 'track',
                                'type': 'line',
                                'source': 'track',
                                'layout': {
                                    'line-join': 'round',
                                    'line-cap': 'round'
                                },
                                'paint': {
                                    'line-color': this.trackLineColor,
                                    'line-width': this.trackLineWeight
                                }
                            });

                            // Add direction arrows source and layer
                            map.addSource('track-directions', {
                                'type': 'geojson',
                                'data': directionPoints
                            });

                            map.addLayer({
                                'id': 'track-directions',
                                'type': 'symbol',
                                'source': 'track-directions',
                                'layout': {
                                    'symbol-placement': 'point',
                                    'icon-image': 'triangle-11',
                                    'icon-rotate': ['get', 'bearing'],
                                    'icon-rotation-alignment': 'map',
                                    'icon-allow-overlap': true,
                                    'icon-ignore-placement': true,
                                    'icon-size': 0.8
                                }
                            });

                            // Fit the map to the track bounds
                            const bounds = interpolatedCoordinates.reduce((bounds, coord) => {
                                return bounds.extend(coord);
                            }, new mapboxgl.LngLatBounds(interpolatedCoordinates[0], interpolatedCoordinates[0]));
                            
                            map.fitBounds(bounds, {
                                padding: 50,
                                duration: 1000
                            });

                            // Wait for 3 seconds after loading the track, then resume location tracking
                            setTimeout(() => {
                                locationTracker.unpause(map);
                            }, 3000);

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

    // Ensure chevron is created even if heading is 0 degrees
    createChevronMarker: function(map, position, heading) {
        const chevron = createChevronIcon(heading || 0); // Default to 0 degrees if heading is not provided
        const marker = new mapboxgl.Marker({
            draggable: false
        })
            .setLngLat(position)
            .setPopup(new mapboxgl.Popup()
                .setHTML(chevron))
            .addTo(map);
        this.directionMarkers.push(marker);
    },
};

export default trackManager;