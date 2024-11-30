// Track management functionality
const trackManager = {
    trackPoints: [],
    trackLine: null,
    startMarker: null,
    endMarker: null,
    wakeLock: null,

    // Initialize track handling
    initTrackHandling: function(map, startIcon, endIcon) {
        document.getElementById('gpx-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    this.clearTrack(map);

                    // Parse GPX
                    const gpx = new DOMParser().parseFromString(e.target.result, 'text/xml');
                    const converted = toGeoJSON.gpx(gpx);

                    // Process the track
                    if (converted.features.length > 0) {
                        const coordinates = converted.features[0].geometry.coordinates;

                        if (coordinates.length > 0) {
                            // Convert coordinates to LatLng array
                            this.trackPoints = coordinates.map(coord => L.latLng(coord[1], coord[0]));

                            // Draw the track
                            this.trackLine = L.polyline(this.trackPoints, {
                                color: 'white',
                                weight: 3
                            }).addTo(map);

                            // Add markers with custom icons
                            this.startMarker = L.marker(this.trackPoints[0], {icon: startIcon}).addTo(map);
                            this.endMarker = L.marker(this.trackPoints[this.trackPoints.length - 1], {icon: endIcon}).addTo(map);

                            // Show clear button
                            document.querySelector('.clear-button').style.display = 'inline-block';

                            // Request wake lock
                            await this.requestWakeLock();
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
            console.error(`${err.name}, ${err.message}`);
        }
    },

    // Function to clear the track
    clearTrack: function(map) {
        if (this.trackLine) {
            map.removeLayer(this.trackLine);
            this.trackLine = null;
        }
        if (this.startMarker) {
            map.removeLayer(this.startMarker);
            this.startMarker = null;
        }
        if (this.endMarker) {
            map.removeLayer(this.endMarker);
            this.endMarker = null;
        }

        this.trackPoints = [];

        // Hide clear button
        document.querySelector('.clear-button').style.display = 'none';
    }
};

export default trackManager;