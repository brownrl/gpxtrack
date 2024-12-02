import trackManager from './track-manager.js';
import mapConfig from './map-config.js';

// UI controls and event listeners
const uiControls = {
    initUIControls: function(map) {
        // File picker button click handler
        document.querySelector('.file-picker-button').addEventListener('click', function() {
            document.getElementById('gpx-file').click();
        });

        // Toggle map button click handler
        document.querySelector('.toggle-map-button').addEventListener('click', function() {
            mapConfig.toggleTileLayer(map);
        });

        // Clear button click handler
        document.querySelector('.clear-button').addEventListener('click', () => {
            trackManager.clearTrack(map);
        });
    }
};

export default uiControls;