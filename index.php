<?php
// Basic headers for PWA
header("Cache-Control: no-store, private");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GPX</title>

    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#000000">
    <meta name="description" content="A PWA for following GPX tracks and tracking location">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black">
    <meta name="apple-mobile-web-app-title" content="GPX">
    
    <!-- PWA Icons -->
    <link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192x192.png">
    <link rel="apple-touch-icon" sizes="192x192" href="icons/icon-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="icons/icon-512x512.png">
    <link rel="apple-touch-icon" sizes="512x512" href="icons/icon-512x512.png">
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="manifest.json">
    
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
     integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
     crossorigin=""/>
    
    <!-- App CSS -->
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="map"></div>
    <div id="progress-display" class="progress-display">&nbsp;</div>
    <div class="file-picker-container">
        <button class="toggle-map-button">MAP</button>
        <button class="file-picker-button">GPX</button>
        <input type="file" id="gpx-file" accept=".gpx" style="display: none;">
        <button class="clear-button" style="display: none">Clear</button>
    </div>

    <!-- Leaflet JavaScript -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
     integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
     crossorigin=""></script>
    
    <!-- ToGeoJSON -->
    <script src="https://cdn.jsdelivr.net/npm/@mapbox/togeojson@0.16.0/togeojson.min.js"></script>

    <!-- App JavaScript -->
    <script type="module" src="app.js"></script>
    
    <!-- Service Worker Registration -->
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {})
                    .catch(err => {});
            });
        }
    </script>
</body>
</html>