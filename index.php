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

    <!-- Include Mapbox GL JS CSS and JS -->
    <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
    <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>

    <!-- App CSS -->
    <link rel="stylesheet" href="styles.css">

    <!-- App JavaScript -->
    <script>
        // Set the Mapbox access token directly in index.php
        mapboxgl.accessToken = 'pk.eyJ1IjoiYnJvd25ybCIsImEiOiJjbTQ4N29lbjcwYmJyMmxzY2FsODJwYnEzIn0.dPYC5kbBiczzT3c1fy9ahw';
    </script>
    <script type="module" src="app.js"></script>

    <!-- ToGeoJSON -->
    <script src="https://cdn.jsdelivr.net/npm/@mapbox/togeojson@0.16.0/togeojson.min.js"></script>

    <!-- Service Worker Registration -->
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => { })
                    .catch(err => { });
            });
        }
    </script>
</head>

<body>
    <div id="map"></div>
    <div id="progress-display" class="progress-display">&nbsp;</div>
    <div class="file-picker-container">
        <button class="file-picker-button">GPX</button>
        <button class="clear-button" style="display: none;">Clear</button>
        <input type="file" id="gpx-file" accept=".gpx" style="display: none;">
    </div>
</body>

</html>