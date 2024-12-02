import locationTracker from './location-tracker.js';
import { createChevronIcon } from './chevron-utils.js';

// Track management functionality
const trackManager = {
    // Default properties for start and end markers
    startMarkerColor: '#00ff00', // Green
    endMarkerColor: '#ff0000', // Red
    markerRadius: 8, // Increased from 5
    markerFillOpacity: 1,

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
    startMarker: null,
    endMarker: null,
    wakeLock: null,
    wakeLockInterval: null, // Interval for re-requesting wake lock
    trackDistances: [], // Pre-calculated distances for each track point

    // Calculate bearing between two points
    calculateBearing: function(start, end) {
        const startLat = start.lat * Math.PI / 180;
        const startLng = start.lng * Math.PI / 180;
        const endLat = end.lat * Math.PI / 180;
        const endLng = end.lng * Math.PI / 180;

        const y = Math.sin(endLng - startLng) * Math.cos(endLat);
        const x = Math.cos(startLat) * Math.sin(endLat) -
                 Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
        
        // Add 270 degrees (90 + 180) to flip the chevron and account for its default right orientation
        return ((Math.atan2(y, x) * 180 / Math.PI) + 270) % 360;
    },

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
                                    const bearing = this.calculateBearing(
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

                            // Add start and end markers as circles
                            this.startMarker = L.circle(this.trackPoints[0], {
                                radius: this.markerRadius,
                                color: this.startMarkerColor,
                                fillColor: this.startMarkerColor,
                                fillOpacity: this.markerFillOpacity
                            }).addTo(map);
                            this.endMarker = L.circle(this.trackPoints[this.trackPoints.length - 1], {
                                radius: this.markerRadius,
                                color: this.endMarkerColor,
                                fillColor: this.endMarkerColor,
                                fillOpacity: this.markerFillOpacity
                            }).addTo(map);

                            // Fit map to track bounds
                            map.fitBounds(this.trackLine.getBounds());

                            // Show clear button
                            document.querySelector('.clear-button').style.display = 'inline-block';

                            // Show progress display when a track is loaded
                            document.getElementById('progress-display').style.display = 'block';

                            // Request wake lock
                            await this.requestWakeLock();

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

    startWakeLockInterval: function() {
        if (this.wakeLockInterval) {
            clearInterval(this.wakeLockInterval);
        }
        this.wakeLockInterval = setInterval(() => {
            this.requestWakeLock();
        }, 60000); // Re-request every 60 seconds
    },

    stopWakeLockInterval: function() {
        if (this.wakeLockInterval) {
            clearInterval(this.wakeLockInterval);
            this.wakeLockInterval = null;
        }
    },

    // Function to request a wake lock
    requestWakeLock: async function() {
        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
            this.wakeLock.addEventListener('release', () => {
                this.startWakeLockInterval(); // Restart interval if wake lock is released
            });
            this.startWakeLockInterval(); // Start interval when wake lock is acquired
        } catch (err) {
            console.error('Failed to acquire wake lock:', err);
        }
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

        if (this.startMarker) {
            map.removeLayer(this.startMarker);
            this.startMarker = null;
        }
        if (this.endMarker) {
            map.removeLayer(this.endMarker);
            this.endMarker = null;
        }

        // Stop the wake lock interval when clearing the track
        this.stopWakeLockInterval();
        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
        }

        // Hide clear button
        document.querySelector('.clear-button').style.display = 'none';

        // Hide progress display when clearing the track
        document.getElementById('progress-display').style.display = 'none';

        // Release wake lock
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