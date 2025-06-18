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
        filePicker: 'file-picker-btn',
        gpxManager: 'gpx-manager-btn',
        closeGpxManager: 'close-gpx-manager',
    },

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
        gpxManagerBtn: '#gpx-manager-btn',
        closeGpxManagerBtn: '#close-gpx-manager',
        gpxManagerModal: '#gpx-manager',
        gpxList: '#gpx-list',

        // By class
        buttonsContainer: '.ui-controls-container',
        drawerButtons: '.drawer-buttons',
        gmapsButton: '.gmaps-button',
        gpxManagerButton: '.gpx-manager-button',
        clearButton: '.clear-button',
        gpxManager: '.gpx-manager',
        gmapsDrawer: '.gmaps-drawer',
    },

    // DOM element references
    elements: {},

    // Component references
    trackManager: null,
    locationTracker: null,
    gpxManager: null,

    // Runtime variables
    hideTimeout: null,

    /**
     * Initialize with app reference and setup UI controls
     * @param {Object} app - The app mediator
     */
    init(app) {
        this.trackManager = app.trackManager();
        this.locationTracker = app.locationTracker();
        this.gpxManager = app.gpxManager();
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
            this.elements.clearButton.style.display = 'flex';
            resetHideTimeout();
        };

        /**
         * Hides the clear button
         */
        this.hideClearButton = function () {
            this.elements.clearButton.style.display = 'none';
        };

        this.showGpxManager = function () {
            const tracks = this.gpxManager.getAllTracks();

            // Clear the list first
            this.elements.gpxList.innerHTML = '';

            if (tracks && tracks.length > 0) {
                this.elements.gpxList.innerHTML = tracks.map(track => `
                    <li>
                        <div class="track-item">
                            <span class="track-name">${track.name || 'Track'}</span>
                            <div class="track-buttons">
                                <button class="track-btn load-track-btn" data-track-id="${track.id}">Load</button>
                                <button class="track-btn delete-track-btn" data-track-id="${track.id}">Delete</button>
                            </div>
                        </div>
                    </li>
                `).join('');

                // Add event listeners for load and delete buttons
                this.elements.gpxList.querySelectorAll('.load-track-btn').forEach(btn => {
                    btn.addEventListener('click', (event) => {
                        const trackId = event.target.getAttribute('data-track-id');
                        this.gpxManager.loadTrack(trackId);
                        this.hideGpxManager();
                        resetHideTimeout();
                    });
                });

                this.elements.gpxList.querySelectorAll('.delete-track-btn').forEach(btn => {
                    btn.addEventListener('click', (event) => {
                        const trackId = event.target.getAttribute('data-track-id');
                        this.gpxManager.removeTrack(trackId);
                        this.showGpxManager(); // Refresh the list
                        resetHideTimeout();
                    });
                });
            }
            this.elements.gpxManagerModal.style.display = 'flex';
        };

        this.hideGpxManager = function () {
            this.elements.gpxManagerModal.style.display = 'none';
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

        this.elements.gmapsButton.addEventListener('click', () => {
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
        this.elements.clearButton.addEventListener('click', () => {
            this.clearTrack();
            resetHideTimeout();
        });

        // GPX Manager button click handler
        this.elements.gpxManagerBtn.addEventListener('click', () => {
            this.showGpxManager();
            resetHideTimeout();
        });

        // Close GPX Manager button click handler
        this.elements.closeGpxManagerBtn.addEventListener('click', () => {
            this.hideGpxManager();
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
    },
};

export default uiControls;