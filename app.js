// Initialize the map with a default view (will be updated when we get location)
var map = L.map('map', {
    zoomControl: false,  // Disable zoom controls
    dragging: false,     // Disable dragging
    touchZoom: false,    // Disable touch zoom
    scrollWheelZoom: false, // Disable scroll wheel zoom
    doubleClickZoom: false, // Disable double click zoom
    boxZoom: false,      // Disable box zoom
    keyboard: false,     // Disable keyboard navigation
}).setView([0, 0], 18);  // Start with closer zoom

// Create black tile layer
var BlackTileLayer = L.TileLayer.extend({
    createTile: function() {
        const tile = document.createElement('canvas');
        tile.width = 256;
        tile.height = 256;
        const ctx = tile.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 256, 256);
        return tile;
    },
    getAttribution: function() {
        return '';
    }
});

// Add black background to map
new BlackTileLayer().addTo(map);

// Create custom icons for start and end
var startIcon = L.divIcon({
    html: '🟢',  // Green circle for start
    className: 'custom-icon start-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

var endIcon = L.divIcon({
    html: '🔴',  // Red circle for end
    className: 'custom-icon end-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

// Add custom icon styling
const iconStyle = document.createElement('style');
iconStyle.textContent = `
    .custom-icon {
        font-size: 30px;
        text-align: center;
        line-height: 30px;
    }
`;
document.head.appendChild(iconStyle);

// Variables for tracking
let trackPoints = [];
let trackLine = null;
let startMarker = null;
let endMarker = null;
let locationCircle = null;

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

    // Always center map on location with animation
    map.setView(e.latlng, 18, {
        animate: true,
        duration: 0.5
    });
}

function onLocationError(e) {
    alert(e.message);
}

// Start watching location
map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);
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
            if (trackLine) {
                map.removeLayer(trackLine);
            }
            if (startMarker) {
                map.removeLayer(startMarker);
            }
            if (endMarker) {
                map.removeLayer(endMarker);
            }
            
            // Parse GPX
            const gpx = new DOMParser().parseFromString(e.target.result, 'text/xml');
            const converted = toGeoJSON.gpx(gpx);
            
            // Process the track
            if (converted.features.length > 0) {
                const coordinates = converted.features[0].geometry.coordinates;
                
                if (coordinates.length > 0) {
                    // Convert coordinates to LatLng array
                    trackPoints = coordinates.map(coord => L.latLng(coord[1], coord[0]));

                    // Draw the track
                    trackLine = L.polyline(trackPoints, {
                        color: 'white',
                        weight: 3
                    }).addTo(map);

                    // Add markers with custom icons
                    startMarker = L.marker(trackPoints[0], {icon: startIcon}).addTo(map);
                    endMarker = L.marker(trackPoints[trackPoints.length - 1], {icon: endIcon}).addTo(map);

                    // Show clear button
                    document.querySelector('.clear-button').style.display = 'inline-block';
                }
            }
        };
        reader.readAsText(file);
    }
});

// Function to clear the track
function clearTrack() {
    if (trackLine) {
        map.removeLayer(trackLine);
        trackLine = null;
    }
    if (startMarker) {
        map.removeLayer(startMarker);
        startMarker = null;
    }
    if (endMarker) {
        map.removeLayer(endMarker);
        endMarker = null;
    }
    
    trackPoints = [];
    
    // Hide clear button
    document.querySelector('.clear-button').style.display = 'none';
    
    // Return to user location
    if (locationCircle) {
        map.setView(locationCircle.getLatLng(), 18, {
            animate: true,
            duration: 1
        });
    }
}

// Add event listeners for buttons
document.querySelector('.file-picker-button').addEventListener('click', function() {
    document.getElementById('gpx-file').click();
});

document.querySelector('.clear-button').addEventListener('click', clearTrack);
