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

        // Show/hide clear button functions
        this.showClearButton = function() {
            document.querySelector('.clear-button').style.display = 'flex';
            resetHideTimeout();
        };

        this.hideClearButton = function() {
            document.querySelector('.clear-button').style.display = 'none';
        };

        // Modal controls
        const drawerButtons = document.querySelector('.drawer-buttons');
        const gmapsButton = document.querySelector('.gmaps-button');
        
        // Create search handler function
        const handleSearch = (searchTerm) => {
            const currentLocation = locationTracker.getCurrentLocation();
            if (currentLocation) {
                const mapsUrl = `https://www.google.com/maps/search/${searchTerm}/@${currentLocation.lat},${currentLocation.lng},13z`;
                window.open(mapsUrl, '_blank');
            }
            drawerButtons.classList.remove('expanded');
            resetHideTimeout();
        };

        // Handle maps button click
        document.getElementById('open-maps-btn').addEventListener('click', () => {
            const currentLocation = locationTracker.getCurrentLocation();
            if (currentLocation) {
                const mapsUrl = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
                window.open(mapsUrl, '_blank');
            }
            drawerButtons.classList.remove('expanded');
            resetHideTimeout();
        });

        // Add click handlers for all search buttons
        [
            ['open-lodging-btn', 'lodging'],
            ['open-market-btn', 'supermarket'],
            ['open-camping-btn', 'camping'],
            ['open-restaurant-btn', 'restaurant'],
            ['open-hospital-btn', 'hospital']
        ].forEach(([id, search]) => {
            document.getElementById(id).addEventListener('click', () => handleSearch(search));
        });

        gmapsButton.addEventListener('click', () => {
            drawerButtons.classList.toggle('expanded');
            // Don't auto-hide controls when drawer is open
            clearTimeout(hideTimeout);
            buttonsContainer.style.opacity = '1';
        });

        // Close drawer when clicking outside
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.gmaps-drawer')) {
                drawerButtons.classList.remove('expanded');
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