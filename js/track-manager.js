import locationTracker from './location-tracker.js';

// Track management functionality
const trackManager = {
    // Default properties for start and end markers
    startMarkerColor: '#00ff00', // Green
    endMarkerColor: '#ff0000', // Red
    markerRadius: 5,
    markerFillOpacity: 1,

    // Default properties for the track line
    trackLineColor: 'white',
    trackLineWeight: 3,

    trackPoints: [],
    trackLine: null,
    startMarker: null,
    endMarker: null,
    wakeLock: null,

    // Initialize track handling
    initTrackHandling: function(map, startIcon, endIcon) {
        const fileInput = document.getElementById('gpx-file');
        fileInput.addEventListener('change', (e) => {
            console.log('GPX file change event triggered');
            const file = e.target.files[0];
            if (file) {
                console.log('File selected:', file.name);
                const reader = new FileReader();
                reader.onload = async (e) => {
                    console.log('File read successfully');
                    this.clearTrack(map);
                    console.log('Previous track cleared');

                    // Reset file input
                    fileInput.value = '';

                    // Pause location tracking
                    locationTracker.pause(map);
                    console.log('Location tracking paused');

                    // Parse GPX
                    const gpx = new DOMParser().parseFromString(e.target.result, 'text/xml');
                    const converted = toGeoJSON.gpx(gpx);
                    console.log('GPX file parsed');

                    // Process the track
                    if (converted.features.length > 0) {
                        const coordinates = converted.features[0].geometry.coordinates;

                        if (coordinates.length > 0) {
                            console.log('Track coordinates found');
                            // Convert coordinates to LatLng array
                            this.trackPoints = coordinates.map(coord => L.latLng(coord[1], coord[0]));

                            // Draw the track
                            this.trackLine = L.polyline(this.trackPoints, {
                                color: this.trackLineColor,
                                weight: this.trackLineWeight
                            }).addTo(map);
                            console.log('Track line added to map');

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
                            console.log('Start and end markers added to map');

                            // Fit map to track bounds
                            map.fitBounds(this.trackLine.getBounds());
                            console.log('Map view adjusted to fit track bounds');

                            // Show clear button
                            document.querySelector('.clear-button').style.display = 'inline-block';

                            // Request wake lock
                            await this.requestWakeLock();
                            console.log('Wake lock requested');

                            // After 3-second delay, unpause location tracking
                            setTimeout(() => {
                                locationTracker.unpause(map);
                                console.log('Location tracking unpaused');
                            }, 3000);
                        }
                    }
                };
                reader.readAsText(file);
            }
        });
    },

    // Function to request a wake lock
    requestWakeLock: async function() {
        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
            this.wakeLock.addEventListener('release', () => {
            });
        } catch (err) {
        }
    },

    // Function to clear the track
    clearTrack: function(map) {
        console.log('clearTrack called');
        if (this.trackLine) {
            map.removeLayer(this.trackLine);
            this.trackLine = null;
            console.log('Track line removed');
        }
        if (this.startMarker) {
            map.removeLayer(this.startMarker);
            this.startMarker = null;
            console.log('Start marker removed');
        }
        if (this.endMarker) {
            map.removeLayer(this.endMarker);
            this.endMarker = null;
            console.log('End marker removed');
        }

        // Release wake lock
        if (this.wakeLock) {
            this.wakeLock.release().then(() => {
                this.wakeLock = null;
                console.log('Wake lock released');
            });
        }

        this.trackPoints = [];
        console.log('Track points cleared');

        // Hide clear button
        document.querySelector('.clear-button').style.display = 'none';
        console.log('Clear button hidden');

        // Reset file input
        document.getElementById('gpx-file').value = '';
    }
};

export default trackManager;