import locationTracker from './location-tracker.js';

// Track management functionality
const trackManager = {
    // Default properties for start and end markers
    startMarkerColor: '#00ff00', // Green
    endMarkerColor: '#ff0000', // Red
    markerRadius: 5,
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

    // Calculate bearing between two points
    calculateBearing: function(start, end) {
        const startLat = start.lat * Math.PI / 180;
        const startLng = start.lng * Math.PI / 180;
        const endLat = end.lat * Math.PI / 180;
        const endLng = end.lng * Math.PI / 180;

        const y = Math.sin(endLng - startLng) * Math.cos(endLat);
        const x = Math.cos(startLat) * Math.sin(endLat) -
                 Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
        
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    },

    // Create chevron icon
    createChevronIcon: function(bearing) {
        return L.divIcon({
            html: `<div style="
                transform: rotate(${bearing - 90}deg);
                font-size: 36px;
                line-height: 0;
                color: white;
                font-weight: bold;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-left: 3px;
                margin-top: 3px;
                font-family: Arial, sans-serif;
            ">›</div>`,
            className: 'chevron-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
    },

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

                            // Draw the track line
                            this.trackLine = L.polyline(this.trackPoints, {
                                color: this.trackLineColor,
                                weight: this.trackLineWeight
                            }).addTo(map);
                            console.log('Track line added to map');

                            // Add circles and direction markers every 4th point
                            for (let i = 0; i < this.trackPoints.length; i++) {
                                // Add markers every 4th point (except for last point)
                                if (i % 4 === 0 && i < this.trackPoints.length - 1) {
                                    // Add circle marker
                                    const circle = L.circle(this.trackPoints[i], {
                                        radius: this.trackPointRadius,
                                        color: this.trackPointColor,
                                        fillColor: this.trackPointColor,
                                        fillOpacity: 1,
                                        weight: this.trackPointWeight
                                    }).addTo(map);
                                    this.trackPointMarkers.push(circle);

                                    // Add direction marker
                                    const bearing = this.calculateBearing(
                                        this.trackPoints[i],
                                        this.trackPoints[i + 1]
                                    );
                                    const marker = L.marker(this.trackPoints[i], {
                                        icon: this.createChevronIcon(bearing),
                                        zIndexOffset: 1000  // Ensure chevrons appear above circles
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
        if (this.trackLine) {
            map.removeLayer(this.trackLine);
            this.trackLine = null;
        }
        
        // Clear track point markers
        this.trackPointMarkers.forEach(marker => map.removeLayer(marker));
        this.trackPointMarkers = [];
        
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

        this.trackPoints = [];
        document.querySelector('.clear-button').style.display = 'none';

        if (this.wakeLock) {
            this.wakeLock.release()
                .then(() => {
                    this.wakeLock = null;
                });
        }
    }
};

export default trackManager;