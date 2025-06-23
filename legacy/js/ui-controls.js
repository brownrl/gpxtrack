/**
 * ui-controls.js
 * Manages all UI controls and their interactions in the application.
 */

const uiControls = {
    // Configuration
    hideTimeoutMs: 3000, // Time in milliseconds before UI controls fade out

    // Element selectors and references
    selectors: {
        // By ID
        openMapsBtn: '#open-maps-btn',
        openLodgingBtn: '#open-lodging-btn',
        openMarketBtn: '#open-market-btn',
        openCampingBtn: '#open-camping-btn',
        openRestaurantBtn: '#open-restaurant-btn',
        openHospitalBtn: '#open-hospital-btn',
        gpxFileInput: '#gpx-file',
        filePickerBtn: '#file-picker-btn',
        zoomBtn: '#zoom-btn',
        reloadBtn: '#reload-btn',
        clearBtn: '#clear-btn',
        gMapsBtn: '#gmaps-btn',


        // By class
        buttonsContainer: '.ui-controls-container',
        drawerButtons: '.drawer-buttons',
        gmapsDrawer: '.gmaps-drawer'
    },

    // DOM element references
    elements: {},

    // Component references
    trackManager: null,
    locationTracker: null,
    map: null,

    // Runtime variables
    hideTimeout: null,

    /**
     * Initialize with app reference and setup UI controls
     * @param {Object} app - The app mediator
     */
    async init(app) {
        this.trackManager = app.trackManager();
        this.locationTracker = app.locationTracker();
        this.map = app.map();
        this.initElementReferences();
        this.initUIControls();
    },

    /**
     * Initialize all DOM element references
     */
    initElementReferences() {
        // Initialize all element references
        Object.entries(this.selectors).forEach(([key, selector]) => {
            if (selector.startsWith('#')) {
                const id = selector.substring(1);
                this.elements[key] = document.getElementById(id);
            } else {
                this.elements[key] = document.querySelector(selector);
            }
        });
    },

    /**
     * Initializes all UI controls and their event listeners
     */
    initUIControls() {
        let hideTimeout;

        /**
         * Resets the auto-hide timeout for UI controls
         * Makes controls visible and sets timeout to hide them
         */
        const resetHideTimeout = () => {
            clearTimeout(hideTimeout);
            this.elements.buttonsContainer.style.opacity = '1';
            hideTimeout = setTimeout(() => {
                this.elements.buttonsContainer.style.opacity = '0';
            }, this.hideTimeoutMs);
        };

        /**
         * Shows the clear button and resets hide timeout
         */
        this.showClearButton = function () {
            this.elements.clearBtn.style.display = 'flex';
            resetHideTimeout();
        };

        /**
         * Hides the clear button
         */
        this.hideClearButton = function () {
            this.elements.clearBtn.style.display = 'none';
        };


        this.showZoomButton = function () {
            this.elements.zoomBtn.style.display = 'flex';
            resetHideTimeout();
        };

        this.hideZoomButton = function () {
            this.elements.zoomBtn.style.display = 'none';
        };

        this.showReloadButton = function () {
            this.elements.reloadBtn.style.display = 'flex';
            resetHideTimeout();
        };

        this.hideReloadButton = function () {
            this.elements.reloadBtn.style.display = 'none';
        };

        // Handle maps button click
        this.elements.openMapsBtn.addEventListener('click', () => {
            const currentLocation = this.locationTracker.getCurrentLocation();
            if (currentLocation) {
                const mapsUrl = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
                window.open(mapsUrl, '_blank');
            }
            this.elements.drawerButtons.classList.remove('expanded');
            resetHideTimeout();
        });

        // Add click handlers for all search buttons
        [
            [this.elements.openLodgingBtn, 'lodging'],
            [this.elements.openMarketBtn, 'supermarket'],
            [this.elements.openCampingBtn, 'camping'],
            [this.elements.openRestaurantBtn, 'restaurant'],
            [this.elements.openHospitalBtn, 'hospital']
        ].forEach(([element, search]) => {
            element.addEventListener('click', () => this.handleSearch(search));
        });

        this.elements.gMapsBtn.addEventListener('click', () => {
            this.elements.drawerButtons.classList.toggle('expanded');
            // Don't auto-hide controls when drawer is open
            clearTimeout(this.hideTimeout);
        });

        // Close drawer when clicking outside
        document.addEventListener('click', (event) => {
            if (!event.target.closest(this.selectors.gmapsDrawer)) {
                this.elements.drawerButtons.classList.remove('expanded');
                resetHideTimeout();
            }
        });

        // Show buttons on interaction
        document.addEventListener('mousemove', resetHideTimeout);
        document.addEventListener('keydown', resetHideTimeout);
        document.addEventListener('touchstart', resetHideTimeout);
        document.addEventListener('touchmove', resetHideTimeout);

        // File picker button click handler
        this.elements.filePickerBtn.addEventListener('click', () => {
            this.elements.gpxFileInput.click();
            resetHideTimeout();
        });

        // Clear button click handler
        this.elements.clearBtn.addEventListener('click', () => {
            this.clearTrack();
            resetHideTimeout();
        });

        this.elements.zoomBtn.addEventListener('click', () => {
            this.map.zoom();
            resetHideTimeout();
        });

        this.elements.reloadBtn.addEventListener('click', () => {
            const lastGpxContent = localStorage.getItem('lastGpxContent');
            if (lastGpxContent) {
                this.trackManager.processGPXTrack(lastGpxContent);
            }
        });

        // Show UI controls when mouse moves
        document.addEventListener('mousemove', () => this.resetHideTimeout());

        const lastGpxContent = localStorage.getItem('lastGpxContent') || false;
        if (lastGpxContent) {
            // If there's a last GPX content, show the reload button
            this.showReloadButton();
        }

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
        this.elements.drawerButtons.classList.remove('expanded');
        this.resetHideTimeout();
    },

    /**
     * Resets the auto-hide timeout for UI controls
     * Makes controls visible and sets timeout to hide them
     */
    resetHideTimeout() {
        clearTimeout(this.hideTimeout);
        this.elements.buttonsContainer.style.opacity = '1';
        this.hideTimeout = setTimeout(() => {
            this.elements.buttonsContainer.style.opacity = '0';
        }, this.hideTimeoutMs);
    },

    /**
     * Clears the current track from the map
     */
    clearTrack() {
        this.trackManager.clearTrack();
        this.map.resetZoom();
    },
};

export default uiControls;