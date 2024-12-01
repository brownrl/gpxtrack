import trackManager from './track-manager.js';
import mapConfig from './map-config.js';

// UI controls and event listeners
const uiControls = {
    initUIControls: function(map) {
        // Add event listeners for buttons
        document.querySelector('.file-picker-button').addEventListener('click', function() {
            document.getElementById('gpx-file').click();
        });

        // Ensure clear button works by correctly referencing trackManager's clearTrack
        const clearButton = document.querySelector('.clear-button');
        if (clearButton) {
            console.log('Clear button found, attaching event listener');
            clearButton.addEventListener('click', () => {
                console.log('Clear button clicked');
                trackManager.clearTrack(map);
            });
        } else {
            console.error('Clear button not found in the DOM');
        }

        // Attach event listener to existing toggle map button
        const toggleMapButton = document.querySelector('.toggle-map-button');
        toggleMapButton.addEventListener('click', function() {
            mapConfig.toggleTileLayer(map);
        });
    }
};

export default uiControls;