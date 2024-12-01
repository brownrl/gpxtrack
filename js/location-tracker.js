// Location tracking functionality

// Default properties for location markers
const markerRadius = 5;
const markerColor = '#3388ff';
const markerFillColor = '#3388ff';
const markerFillOpacity = 1;

// Removed map dependency from locationTracker
const locationTracker = {
    paused: false,
    zoomLevel: 18,
    locationCircle: null,

    initLocationTracking: function(map) {
        this.unpause(map);
    },

    onLocationFound: function(e, map) {
        if (!map || typeof map.addLayer !== 'function') {
            return;
        }

        if (this.locationCircle) {
            map.removeLayer(this.locationCircle);
        }

        this.locationCircle = L.circle(e.latlng, {
            radius: markerRadius,
            color: markerColor,
            fillColor: markerFillColor,
            fillOpacity: markerFillOpacity
        }).addTo(map);

        map.setView(e.latlng, this.zoomLevel, {
            animate: true,
            duration: 0.5
        });
    },

    onLocationError: function(e) {
        alert(e.message);
    },

    pause: function(map) {
        this.paused = true;
        map.off('locationfound', this.onLocationFound);
        map.off('locationerror', this.onLocationError);
        map.stopLocate();
    },

    unpause: function(map) {
        this.paused = false;
        if (!map || typeof map.on !== 'function') {
            return;
        }
        map.on('locationfound', (e) => this.onLocationFound(e, map));
        map.on('locationerror', this.onLocationError);
        map.locate({
            watch: true,
            enableHighAccuracy: true,
            timeout: 10000
        });
    }
};

export default locationTracker;