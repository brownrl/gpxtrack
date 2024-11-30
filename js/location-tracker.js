// Location tracking functionality
const locationTracker = {
    initLocationTracking: function(map) {
        // Start watching location
        map.on('locationfound', this.onLocationFound.bind(this, map));
        map.on('locationerror', this.onLocationError);
        map.locate({
            watch: true,
            enableHighAccuracy: true,
            timeout: 10000
        });
    },

    onLocationFound: function(map, e) {
        if (this.locationCircle) {
            map.removeLayer(this.locationCircle);
        }

        this.locationCircle = L.circle(e.latlng, {
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
    },

    onLocationError: function(e) {
        alert(e.message);
    },

    locationCircle: null
};

export default locationTracker;