<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GPX Track Follower</title>
    
    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#000000">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black">
    <meta name="apple-mobile-web-app-title" content="GPX Track">
    <link rel="manifest" href="manifest.json">
    
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
     integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
     crossorigin=""/>
    
    <style>
        #map {
            height: 100vh;
            width: 100%;
            position: absolute;
            top: 0;
            left: 0;
            transform-origin: center center;
        }
        body {
            margin: 0;
            padding: 0;
        }
        .file-picker-container {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            display: flex;
            gap: 10px;
        }
        .status-panel {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 18px;
            font-family: monospace;
            display: none;  /* Hidden by default */
            text-align: center;
            white-space: nowrap;
        }
        .status-panel > div {
            display: inline-block;
            margin: 0 10px;
        }
        .file-picker-button, .clear-button {
            background-color: rgba(255, 255, 255, 0.9);
            border: none;
            padding: 10px 20px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 16px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        .clear-button {
            background-color: rgba(255, 80, 80, 0.9);
            color: white;
        }
        #gpx-file {
            display: none;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <div class="status-panel" id="status-panel">
        <div id="time">--:--</div>
        <div id="distance">-- km</div>
    </div>
    <div class="file-picker-container">
        <input type="file" id="gpx-file" accept=".gpx">
        <button class="file-picker-button" onclick="document.getElementById('gpx-file').click()">
            Choose GPX File
        </button>
        <button class="clear-button" onclick="clearTrack()">
            Clear Track
        </button>
    </div>

    <!-- Leaflet JavaScript -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
     integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
     crossorigin=""></script>
    
    <!-- ToGeoJSON for GPX parsing -->
    <script src="https://unpkg.com/@tmcw/togeojson@5.8.1/dist/togeojson.umd.js"></script>

    <script>
        // Register Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful');
                    })
                    .catch(err => {
                        console.log('ServiceWorker registration failed: ', err);
                    });
            });
        }

        // Initialize the map with a default view (will be updated when we get location)
        var map = L.map('map', {
            zoomControl: false,  // Disable zoom controls
            dragging: false,     // Disable dragging
            touchZoom: false,    // Disable touch zoom
            scrollWheelZoom: false, // Disable scroll wheel zoom
            doubleClickZoom: false, // Disable double click zoom
            boxZoom: false,      // Disable box zoom
            keyboard: false,     // Disable keyboard navigation
            rotate: true,        // Enable rotation
            bearing: 0           // Initial bearing
        }).setView([0, 0], 18);  // Start with closer zoom
        var locationCircle;
        var currentTrack;
        var startMarker;
        var endMarker;
        var recentPositions = [];
        var trackPoints = [];  // Store track points for distance calculation
        var totalTrackDistance = 0;
        var wakeLock = null;  // Store wake lock
        const POSITION_HISTORY = 3; // Number of positions to keep for calculating heading

        // Function to acquire wake lock
        async function acquireWakeLock() {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake Lock is active');
            } catch (err) {
                console.log(`${err.name}, ${err.message}`);
            }
        }

        // Function to release wake lock
        async function releaseWakeLock() {
            if (wakeLock !== null) {
                try {
                    await wakeLock.release();
                    wakeLock = null;
                    console.log('Wake Lock is released');
                } catch (err) {
                    console.log(`${err.name}, ${err.message}`);
                }
            }
        }

        // Handle visibility change
        document.addEventListener('visibilitychange', async () => {
            if (wakeLock !== null && document.visibilityState === 'visible') {
                await acquireWakeLock();
            }
        });

        // Function to calculate bearing between two points
        function calculateBearing(start, end) {
            const startLat = start.lat * Math.PI / 180;
            const startLng = start.lng * Math.PI / 180;
            const endLat = end.lat * Math.PI / 180;
            const endLng = end.lng * Math.PI / 180;

            const y = Math.sin(endLng - startLng) * Math.cos(endLat);
            const x = Math.cos(startLat) * Math.sin(endLat) -
                     Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
            
            let bearing = Math.atan2(y, x) * 180 / Math.PI;
            if (bearing < 0) {
                bearing += 360;
            }
            return bearing;
        }

        // Function to update map rotation based on recent positions
        function updateMapRotation() {
            if (recentPositions.length >= 2) {
                const start = recentPositions[0];
                const end = recentPositions[recentPositions.length - 1];
                
                // Only rotate if we've moved more than 1 meter
                const distance = start.distanceTo(end);
                if (distance > 1) {
                    const bearing = calculateBearing(start, end);
                    map.setBearing(bearing);
                }
            }
        }

        // Create custom icons
        var startIcon = L.divIcon({
            html: '★',
            className: 'custom-icon',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        var endIcon = L.divIcon({
            html: '⛔',
            className: 'custom-icon',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        // Add custom icon styling
        const iconStyle = document.createElement('style');
        iconStyle.textContent = `
            .custom-icon {
                color: white;
                font-size: 20px;
                text-align: center;
                line-height: 20px;
                text-shadow: 0 0 3px black;
            }
        `;
        document.head.appendChild(iconStyle);

        // Create custom black tile layer
        L.TileLayer.Black = L.TileLayer.extend({
            createTile: function() {
                const tile = document.createElement('canvas');
                tile.width = 256;
                tile.height = 256;
                const ctx = tile.getContext('2d');
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, 256, 256);
                return tile;
            }
        });

        L.tileLayer.black = function() {
            return new L.TileLayer.Black();
        }

        // Add the black tile layer to the map
        L.tileLayer.black().addTo(map);

        // Function to update time
        function updateTime() {
            const now = new Date();
            document.getElementById('time').textContent = 
                now.toLocaleTimeString('en-US', { 
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit'
                });
        }
        setInterval(updateTime, 1000);

        // Function to find closest point on track
        function findClosestPointOnTrack(position) {
            if (!trackPoints.length) return null;
            
            let minDist = Infinity;
            let closestPoint = null;
            let closestIndex = 0;
            
            for (let i = 0; i < trackPoints.length; i++) {
                const dist = position.distanceTo(trackPoints[i]);
                if (dist < minDist) {
                    minDist = dist;
                    closestPoint = trackPoints[i];
                    closestIndex = i;
                }
            }
            
            return {
                point: closestPoint,
                index: closestIndex,
                distance: minDist
            };
        }

        // Function to calculate remaining distance
        function calculateRemainingDistance(currentIndex) {
            let remaining = 0;
            for (let i = currentIndex; i < trackPoints.length - 1; i++) {
                remaining += trackPoints[i].distanceTo(trackPoints[i + 1]);
            }
            return remaining;
        }

        // Function to update location
        function onLocationFound(e) {
            if (locationCircle) {
                map.removeLayer(locationCircle);
            }

            locationCircle = L.circle(e.latlng, {
                radius: 5,
                color: '#3388ff',
                fillColor: '#3388ff',
                fillOpacity: 1
            }).addTo(map);

            // Update recent positions for rotation
            recentPositions.push(e.latlng);
            if (recentPositions.length > POSITION_HISTORY) {
                recentPositions.shift();
            }

            // Update map rotation
            updateMapRotation();

            // Update distance if we have a track
            if (trackPoints.length > 0) {
                const closest = findClosestPointOnTrack(e.latlng);
                if (closest) {
                    const remaining = calculateRemainingDistance(closest.index);
                    document.getElementById('distance').textContent = 
                        (remaining / 1000).toFixed(1) + ' km';
                }
            }

            // Center map on location
            map.setView(e.latlng, 18, {
                animate: true
            });
        }

        function onLocationError(e) {
            alert(e.message);
        }

        // Set up location event handlers
        map.on('locationfound', onLocationFound);
        map.on('locationerror', onLocationError);

        // Request location updates
        map.locate({
            watch: true,
            enableHighAccuracy: true,
            timeout: 10000
        });

        // Handle GPX file selection
        document.getElementById('gpx-file').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Clear previous track and markers
                    if (currentTrack) {
                        map.removeLayer(currentTrack);
                    }
                    if (startMarker) {
                        map.removeLayer(startMarker);
                    }
                    if (endMarker) {
                        map.removeLayer(endMarker);
                    }

                    // Parse GPX
                    const parser = new DOMParser();
                    const gpx = parser.parseFromString(e.target.result, 'text/xml');
                    const geoJson = toGeoJSON.gpx(gpx);

                    // Find the track coordinates
                    if (geoJson.features.length > 0) {
                        const track = geoJson.features[0];
                        const coordinates = track.geometry.coordinates;

                        if (coordinates.length > 0) {
                            // Convert coordinates to LatLng array
                            trackPoints = coordinates.map(coord => L.latLng(coord[1], coord[0]));

                            // Draw the track
                            currentTrack = L.polyline(trackPoints, {
                                color: 'white',
                                weight: 3
                            }).addTo(map);

                            // Add markers
                            startMarker = L.marker(trackPoints[0], {icon: startIcon}).addTo(map);
                            endMarker = L.marker(trackPoints[trackPoints.length - 1], {icon: endIcon}).addTo(map);

                            // Show status panel
                            document.getElementById('status-panel').style.display = 'block';

                            // Acquire wake lock to keep screen on
                            acquireWakeLock();

                            // Calculate initial remaining distance
                            if (locationCircle) {
                                const closest = findClosestPointOnTrack(locationCircle.getLatLng());
                                if (closest) {
                                    const remaining = calculateRemainingDistance(closest.index);
                                    document.getElementById('distance').textContent = 
                                        (remaining / 1000).toFixed(1) + ' km';
                                }
                            }

                            // Fit bounds and set timer to return to location
                            const bounds = L.latLngBounds(trackPoints);
                            map.fitBounds(bounds);
                            setTimeout(() => {
                                if (locationCircle) {
                                    map.setView(locationCircle.getLatLng(), 18, {
                                        animate: true,
                                        duration: 1
                                    });
                                }
                            }, 5000);
                        }
                    }
                };
                reader.readAsText(file);
            }
        });

        // Function to clear the track
        function clearTrack() {
            if (currentTrack) {
                map.removeLayer(currentTrack);
                currentTrack = null;
            }
            if (startMarker) {
                map.removeLayer(startMarker);
                startMarker = null;
            }
            if (endMarker) {
                map.removeLayer(endMarker);
                endMarker = null;
            }
            
            // Clear track points and hide status panel
            trackPoints = [];
            document.getElementById('status-panel').style.display = 'none';
            
            // Release wake lock
            releaseWakeLock();
            
            // Return to user location
            if (locationCircle) {
                map.setView(locationCircle.getLatLng(), 18, {
                    animate: true,
                    duration: 1
                });
            }
        }
    </script>
</body>
</html>
