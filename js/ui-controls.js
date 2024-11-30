import trackManager from './track-manager.js';

// UI controls and event listeners
const uiControls = {
    initUIControls: function(map) {
        // Add event listeners for buttons
        document.querySelector('.file-picker-button').addEventListener('click', function() {
            document.getElementById('gpx-file').click();
        });

        // Ensure clear button works by correctly referencing trackManager's clearTrack
        const clearButton = document.querySelector('.clear-button');
        clearButton.addEventListener('click', () => trackManager.clearTrack(map));
    },

    clearTrack: function() {
        // This function will be overridden by trackManager's clearTrack
    }
};

export default uiControls;