/**
 * ui-controls.js
 * Manages all UI controls and their interactions in the application.
 */

const uiControls = {
    // Configuration
    hideTimeoutMs: 3000, // Time in milliseconds before UI controls fade out
    buttonIds: {
        openMaps: 'open-maps-btn',
        openLodging: 'open-lodging-btn',
        openMarket: 'open-market-btn',
        openCamping: 'open-camping-btn',
        openRestaurant: 'open-restaurant-btn',
        openHospital: 'open-hospital-btn',
        clear: 'clear-button',
        filePicker: 'file-picker-button'
    },
    
    // Component references
    trackManager: null,
    locationTracker: null,

    // Runtime variables
    buttonsContainer: null,
    hideTimeout: null,
    drawerButtons: null,
    gmapsButton: null,

    /**
     * Initialize with app reference and setup UI controls
     * @param {Object} app - The app mediator
     */
    init(app) {
        this.trackManager = app.trackManager();
        this.locationTracker = app.locationTracker();
        this.initUIControls();
    },

    /**
     * Initializes all UI controls and their event listeners
     */
    initUIControls() {
        this.buttonsContainer = document.querySelector('.ui-controls-container');
        this.drawerButtons = document.querySelector('.drawer-buttons');
        this.gmapsButton = document.querySelector('.gmaps-button');
        let hideTimeout;

        /**
         * Resets the auto-hide timeout for UI controls
         * Makes controls visible and sets timeout to hide them
         */
        const resetHideTimeout = () => {
            clearTimeout(hideTimeout);
            this.buttonsContainer.style.opacity = '1';
            hideTimeout = setTimeout(() => {
                this.buttonsContainer.style.opacity = '0';
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

        // Handle maps button click
        document.getElementById(this.buttonIds.openMaps).addEventListener('click', () => {
            const currentLocation = this.locationTracker.getCurrentLocation();
            if (currentLocation) {
                const mapsUrl = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
                window.open(mapsUrl, '_blank');
            }
            this.drawerButtons.classList.remove('expanded');
            resetHideTimeout();
        });

        // Add click handlers for all search buttons
        [
            [this.buttonIds.openLodging, 'lodging'],
            [this.buttonIds.openMarket, 'supermarket'],
            [this.buttonIds.openCamping, 'camping'],
            [this.buttonIds.openRestaurant, 'restaurant'],
            [this.buttonIds.openHospital, 'hospital']
        ].forEach(([id, search]) => {
            document.getElementById(id).addEventListener('click', () => this.handleSearch(search));
        });

        this.gmapsButton.addEventListener('click', () => {
            this.drawerButtons.classList.toggle('expanded');
            // Don't auto-hide controls when drawer is open
            clearTimeout(this.hideTimeout);
        });

        // Close drawer when clicking outside
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.gmaps-drawer')) {
                this.drawerButtons.classList.remove('expanded');
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
        document.addEventListener('mousemove', () => this.resetHideTimeout());

        // Initialize hide timeout
        resetHideTimeout();
    },

    /**
     * Handles search requests to Google Maps
     * Opens Google Maps in a new tab with the search term
     * @param {string} searchTerm - Term to search for in Google Maps
     */
    handleSearch(searchTerm) {
        const currentLocation = this.locationTracker.getCurrentLocation();
        if (currentLocation) {
            const mapsUrl = `https://www.google.com/maps/search/${searchTerm}/@${currentLocation.lat},${currentLocation.lng},13z`;
            window.open(mapsUrl, '_blank');
        }
        this.drawerButtons.classList.remove('expanded');
        this.resetHideTimeout();
    },

    /**
     * Resets the auto-hide timeout for UI controls
     * Makes controls visible and sets timeout to hide them
     */
    resetHideTimeout() {
        clearTimeout(this.hideTimeout);
        this.buttonsContainer.style.opacity = '1';
        this.hideTimeout = setTimeout(() => {
            this.buttonsContainer.style.opacity = '0';
        }, this.hideTimeoutMs);
    },

    /**
     * Clears the current track from the map
     */
    clearTrack() {
        this.trackManager.clearTrack();
    },
};

export default uiControls;