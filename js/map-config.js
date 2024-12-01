// Map configuration and initialization
const mapConfig = {
  zoomLevel: 18,
  blackTileLayer: null,
  osmTileLayer: null,

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
    }).setView([0, 0], this.zoomLevel);      // Start with closer zoom

    // Initialize tile layers
    this.blackTileLayer = this.createBlackTileLayer();
    this.osmTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
    });

    // Add black background initially
    this.blackTileLayer.addTo(map);
    
    return map;
  },

  // Toggle black tile layer and openstreetmap tile layer
  toggleTileLayer: function(map) {
    if (map.hasLayer(this.blackTileLayer)) {
      map.removeLayer(this.blackTileLayer);
      this.osmTileLayer.addTo(map);
    } else {
      map.removeLayer(this.osmTileLayer);
      this.blackTileLayer.addTo(map);
    }
  },

  // Create and return the black tile layer
  createBlackTileLayer: function() {
    const BlackTileLayer = L.TileLayer.extend({
      createTile: function() {
        const tile = document.createElement('canvas');
        tile.width = tile.height = 256;
        const ctx = tile.getContext('2d');
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, tile.width, tile.height);
        return tile;
      }
    });
    return new BlackTileLayer();
  }
};

export default mapConfig;
