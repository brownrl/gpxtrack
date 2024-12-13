/**
 * ui-controls.js
 * Manages all UI controls and their interactions in the application.
 */

const uiControls = {
    // Configuration
    hideTimeoutMs: 3000, // Time in milliseconds before UI controls fade out
    
    // Component references
    app: null,
    map: null,
    mapInstance: null,
    trackManager: null,
    locationTracker: null,

    /**
     * Initialize with app reference and setup UI controls
     * @param {Object} app - The app mediator
     */
    init(app) {
        this.app = app;
        this.map = app.map();
        this.mapInstance = this.map.getInstance();
        this.trackManager = app.trackManager();
        this.locationTracker = app.locationTracker();
        this.initUIControls();
    },

    /**
     * Initializes all UI controls and their event listeners
     */
    initUIControls() {
        const buttonsContainer = document.querySelector('.ui-controls-container');
        let hideTimeout;

        /**
         * Resets the auto-hide timeout for UI controls
         * Makes controls visible and sets timeout to hide them
         */
        const resetHideTimeout = () => {
            clearTimeout(hideTimeout);
            buttonsContainer.style.opacity = '1';
            hideTimeout = setTimeout(() => {
                buttonsContainer.style.opacity = '0';
            }, this.hideTimeoutMs);
        };

        /**
         * Shows the clear button and resets hide timeout
         */
        this.showClearButton = function() {
            document.querySelector('.clear-button').style.display = 'flex';
            resetHideTimeout();
        };

        /**
         * Hides the clear button
         */
        this.hideClearButton = function() {
            document.querySelector('.clear-button').style.display = 'none';
        };

        // Initialize Google Maps drawer controls
        const drawerButtons = document.querySelector('.drawer-buttons');
        const gmapsButton = document.querySelector('.gmaps-button');
        
        /**
         * Handles search requests to Google Maps
         * Opens Google Maps in a new tab with the search term
         * @param {string} searchTerm - Term to search for in Google Maps
         */
        const handleSearch = (searchTerm) => {
            const currentLocation = this.locationTracker.getCurrentLocation();
            if (currentLocation) {
                const mapsUrl = `https://www.google.com/maps/search/${searchTerm}/@${currentLocation.lat},${currentLocation.lng},13z`;
                window.open(mapsUrl, '_blank');
            }
            drawerButtons.classList.remove('expanded');
            resetHideTimeout();
        };

        // Handle maps button click
        document.getElementById('open-maps-btn').addEventListener('click', () => {
            const currentLocation = this.locationTracker.getCurrentLocation();
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
            this.clearTrack();
            resetHideTimeout();
        });

        // Show UI controls when mouse moves
        document.addEventListener('mousemove', resetHideTimeout);

        // Initialize hide timeout
        resetHideTimeout();
    },

    /**
     * Clears the current track from the map
     */
    clearTrack() {
        this.trackManager.clearTrack(this.mapInstance);
    },
};

export default uiControls;