import trackManager from './track-manager.js';
import mapConfig from './map-config.js';

// UI controls and event listeners
const uiControls = {
    initUIControls: function(map) {
        const buttonsContainer = document.querySelector('.file-picker-container');
        let hideTimeout;

        const resetHideTimeout = () => {
            clearTimeout(hideTimeout);
            buttonsContainer.style.opacity = '1';
            hideTimeout = setTimeout(() => {
                buttonsContainer.style.opacity = '0';
            }, 10000);
        };

        // Show buttons on interaction
        document.addEventListener('mousemove', resetHideTimeout);
        document.addEventListener('keydown', resetHideTimeout);
        document.addEventListener('touchstart', resetHideTimeout);
        document.addEventListener('touchmove', resetHideTimeout);

        // File picker button click handler
        document.querySelector('.file-picker-button').addEventListener('click', function() {
            document.getElementById('gpx-file').click();
            resetHideTimeout();
        });

        // Clear button click handler
        document.querySelector('.clear-button').addEventListener('click', () => {
            trackManager.clearTrack(map);
            resetHideTimeout();
        });

        // Initialize hide timeout
        resetHideTimeout();
    }
};

export default uiControls;