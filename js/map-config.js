// Map configuration and initialization
const mapConfig = {
    // Initialize and return the map instance
    initMap: function() {
        const map = L.map('map', {
            zoomControl: false,      // Disable zoom controls
            dragging: false,         // Disable dragging
            touchZoom: false,        // Disable touch zoom
            scrollWheelZoom: false,  // Disable scroll wheel zoom
            doubleClickZoom: false,  // Disable double click zoom
            boxZoom: false,          // Disable box zoom
            keyboard: false,         // Disable keyboard navigation
        }).setView([0, 0], 18);      // Start with closer zoom

        // Add black background
        this.createBlackTileLayer().addTo(map);
        
        return map;
    },

    // Create and return the black tile layer
    createBlackTileLayer: function() {
        const BlackTileLayer = L.TileLayer.extend({
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

        return new BlackTileLayer();
    }
};

export default mapConfig;
