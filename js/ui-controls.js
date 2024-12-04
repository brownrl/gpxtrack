import trackManager from './track-manager.js';
import locationTracker from './location-tracker.js';

// UI controls and event listeners
const uiControls = {
    // Configuration
    hideTimeoutMs: 3000, // Time in milliseconds before UI controls fade out

    initUIControls: function(map) {
        const buttonsContainer = document.querySelector('.ui-controls-container');
        let hideTimeout;

        const resetHideTimeout = () => {
            clearTimeout(hideTimeout);
            buttonsContainer.style.opacity = '1';
            hideTimeout = setTimeout(() => {
                buttonsContainer.style.opacity = '0';
            }, this.hideTimeoutMs);
        };

        // Modal controls
        const modal = document.getElementById('gmaps-modal');
        const gmapsButton = document.querySelector('.gmaps-button');
        const closeButton = document.querySelector('.close-modal');
        
        // Handle maps button click
        document.getElementById('open-maps-btn').addEventListener('click', () => {
            const currentLocation = locationTracker.getCurrentLocation();
            if (currentLocation) {
                const mapsUrl = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
                window.open(mapsUrl, '_blank');
            }
            modal.style.display = 'none';
            resetHideTimeout();
        });

        // Handle all search buttons
        const searchButtons = [
            { id: 'open-lodging-btn', search: 'lodging' },
            { id: 'open-market-btn', search: 'supermarket' },
            { id: 'open-camping-btn', search: 'camping' },
            { id: 'open-restaurant-btn', search: 'restaurant' },
            { id: 'open-hospital-btn', search: 'hospital' }
        ];

        searchButtons.forEach(button => {
            document.getElementById(button.id).addEventListener('click', () => {
                const currentLocation = locationTracker.getCurrentLocation();
                if (currentLocation) {
                    const mapsUrl = `https://www.google.com/maps/search/${button.search}/@${currentLocation.lat},${currentLocation.lng},13z`;
                    window.open(mapsUrl, '_blank');
                }
                modal.style.display = 'none';
                resetHideTimeout();
            });
        });

        gmapsButton.addEventListener('click', () => {
            modal.style.display = 'block';
            // Don't auto-hide controls when modal is open
            clearTimeout(hideTimeout);
            buttonsContainer.style.opacity = '1';
        });

        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
            resetHideTimeout();
        });

        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
                resetHideTimeout();
            }
        });

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