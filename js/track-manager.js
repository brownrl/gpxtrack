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

    trackPoints: [],
    trackLine: null,
    trackPointMarkers: [],
    directionMarkers: [],
    trackDistances: [], // Pre-calculated distances for each track point

    // Calculate cumulative distances for the track
    calculateTrackDistances: function() {
        this.trackDistances = [0];
        for (let i = 1; i < this.trackPoints.length; i++) {
            const distance = this.trackPoints[i - 1].distanceTo(this.trackPoints[i]);
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
                            // Convert coordinates to LatLng array
                            this.trackPoints = coordinates.map(coord => L.latLng(coord[1], coord[0]));

                            // Calculate track distances
                            this.calculateTrackDistances();

                            // Draw the track line
                            this.trackLine = L.polyline(this.trackPoints, {
                                color: this.trackLineColor,
                                weight: this.trackLineWeight
                            }).addTo(map);

                            // Add direction markers every 4th point
                            for (let i = 0; i < this.trackPoints.length; i++) {
                                // Add markers every 4th point (except for last point)
                                if (i % 4 === 0 && i < this.trackPoints.length - 1) {
                                    // Add direction marker
                                    const bearing = calculateBearing(
                                        this.trackPoints[i],
                                        this.trackPoints[i + 1]
                                    );
                                    const marker = L.marker(this.trackPoints[i], {
                                        icon: createChevronIcon(bearing),
                                        zIndexOffset: 1000
                                    }).addTo(map);
                                    this.directionMarkers.push(marker);
                                }
                            }

                            // Fit map to track bounds
                            map.fitBounds(this.trackLine.getBounds());

                            // Show clear button
                            document.querySelector('.clear-button').style.display = 'inline-block';

                            // Show progress display when a track is loaded
                            document.getElementById('progress-display').style.display = 'block';

                            // After 3-second delay, unpause location tracking
                            setTimeout(() => {
                                locationTracker.unpause(map);
                            }, 3000);
                        }
                    }
                };
                reader.readAsText(file);
            }
        });
    },

    // Function to clear the track
    clearTrack: function(map) {
        if (this.trackLine) {
            map.removeLayer(this.trackLine);
            this.trackLine = null;
        }
        
        // Clear direction markers
        this.directionMarkers.forEach(marker => map.removeLayer(marker));
        this.directionMarkers = [];

        // Hide clear button
        document.querySelector('.clear-button').style.display = 'none';

        // Hide progress display when clearing the track
        document.getElementById('progress-display').style.display = 'none';
    },

    // Ensure chevron is created even if heading is 0 degrees
    createChevronMarker: function(map, position, heading) {
        const chevron = createChevronIcon(heading || 0); // Default to 0 degrees if heading is not provided
        chevron.setLatLng(position);
        chevron.addTo(map);
        this.directionMarkers.push(chevron);
    },
};

export default trackManager;