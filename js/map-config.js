// Map configuration and initialization

const mapConfig = {
  zoomLevel: 17,

  // Initialize and return the map instance
  initMap: function() {
    const map = new mapboxgl.Map({
      container: 'map', // container ID
      style: 'mapbox://styles/brownrl/cm48cuxe6014o01si62vr078z', // custom style URL
      center: [10, 50], // Center over Europe
      zoom: 4, // Zoom level to show Europe
      interactive: false // Disable interactions
    });

    return map;
  }
};

export default mapConfig;
