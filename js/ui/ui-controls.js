/**
 * ui-controls.js
 * Pure UI event handling and user interaction management
 */

import config from '../core/config.js';

class UIControls {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.elements = {};
        this.setupEventListeners();
        this.initializeElements();
        this.setupUserInteractionDetection();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // UI state changes
        this.eventBus.on('ui:controls-visibility-changed', this.handleControlsVisibilityChanged, this);
        this.eventBus.on('ui:button-visibility-changed', this.handleButtonVisibilityChanged, this);
        this.eventBus.on('ui:drawer-state-changed', this.handleDrawerStateChanged, this);
        this.eventBus.on('ui:location-overlay-visibility-changed', this.handleLocationOverlayVisibilityChanged, this);
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        Object.entries(config.ui.selectors).forEach(([key, selector]) => {
            if (selector.startsWith('#')) {
                const id = selector.substring(1);
                this.elements[key] = document.getElementById(id);
            } else {
                this.elements[key] = document.querySelector(selector);
            }
            console.log(`Initialized element: ${key} -> ${this.elements[key] ? 'Success' : 'Failed'}`);
        });

        this.setupButtonEventListeners();
        this.setupDrawerEventListeners();
    }

    /**
     * Setup button event listeners
     */
    setupButtonEventListeners() {
        // File picker button
        if (this.elements.filePickerBtn) {
            this.elements.filePickerBtn.addEventListener('click', () => {
                this.eventBus.emit('track:load-file-requested');
                this.emitUserInteraction();
            });
        }

        // Clear button
        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', () => {
                this.eventBus.emit('track:clear-requested');
                this.eventBus.emit('map:zoom-reset-requested');
                this.emitUserInteraction();
            });
        }

        // Zoom button
        if (this.elements.zoomBtn) {
            this.elements.zoomBtn.addEventListener('click', () => {
                this.eventBus.emit('map:zoom-requested');
                this.emitUserInteraction();
            });
        }

        // Reload button
        if (this.elements.reloadBtn) {
            this.elements.reloadBtn.addEventListener('click', () => {
                this.eventBus.emit('track:reload-requested');
                this.emitUserInteraction();
            });
        }

        // Google Maps buttons
        if (this.elements.openMapsBtn) {
            this.elements.openMapsBtn.addEventListener('click', () => {
                this.handleMapSearch('location');
                this.closeDrawer();
            });
        }

        // Search buttons
        const searchButtons = [
            [this.elements.openLodgingBtn, 'lodging'],
            [this.elements.openMarketBtn, 'supermarket'],
            [this.elements.openCampingBtn, 'camping'],
            [this.elements.openRestaurantBtn, 'restaurant'],
            [this.elements.openHospitalBtn, 'hospital']
        ];

        searchButtons.forEach(([element, searchType]) => {
            if (element) {
                element.addEventListener('click', () => {
                    this.handleMapSearch(searchType);
                    this.closeDrawer();
                });
            }
        });
    }

    /**
     * Setup drawer event listeners
     */
    setupDrawerEventListeners() {
        // Google Maps drawer button
        if (this.elements.gMapsBtn) {
            this.elements.gMapsBtn.addEventListener('click', () => {
                this.eventBus.emit('ui:drawer-toggle');
                this.emitUserInteraction();
            });
        }

        // Close drawer when clicking outside
        document.addEventListener('click', (event) => {
            if (!event.target.closest(config.ui.selectors.gmapsDrawer)) {
                this.closeDrawer();
            }
        });
    }

    /**
     * Setup user interaction detection
     */
    setupUserInteractionDetection() {
        const interactionEvents = ['mousemove', 'keydown', 'touchstart', 'touchmove'];

        interactionEvents.forEach(eventType => {
            document.addEventListener(eventType, () => {
                this.emitUserInteraction();
            });
        });
    }

    /**
     * Handle map search request
     * @param {string} searchType - Type of search to perform
     */
    handleMapSearch(searchType) {
        console.log(`Emitting ui:map-search-requested with searchType: ${searchType}`);
        this.eventBus.emit('ui:map-search-requested', {
            searchType
        });
    }

    /**
     * Close drawer
     */
    closeDrawer() {
        this.eventBus.emit('ui:drawer-close');
        this.emitUserInteraction();
    }

    /**
     * Emit user interaction event
     */
    emitUserInteraction() {
        this.eventBus.emit('ui:user-interaction');
    }

    /**
     * Handle controls visibility change
     * @param {Object} data - Visibility data
     */
    handleControlsVisibilityChanged(data) {
        const { visible } = data;

        if (this.elements.buttonsContainer) {
            this.elements.buttonsContainer.style.opacity = visible ? '1' : '0';
        }
    }

    /**
     * Handle button visibility change
     * @param {Object} data - Button visibility data
     */
    handleButtonVisibilityChanged(data) {
        const { button, visible } = data;

        const elementKey = `${button}Btn`;
        const element = this.elements[elementKey];

        if (element) {
            element.style.display = visible ? 'flex' : 'none';
        }
    }

    /**
     * Handle drawer state change
     * @param {Object} data - Drawer state data
     */
    handleDrawerStateChanged(data) {
        const { expanded } = data;

        if (this.elements.drawerButtons) {
            if (expanded) {
                this.elements.drawerButtons.classList.add('expanded');
            } else {
                this.elements.drawerButtons.classList.remove('expanded');
            }
        }
    }

    /**
     * Handle location overlay visibility change
     * @param {Object} data - Visibility data
     */
    handleLocationOverlayVisibilityChanged(data) {
        const { visible } = data;

        const overlay = document.querySelector(config.ui.selectors.locationOverlay);
        if (overlay) {
            overlay.style.display = visible ? 'block' : 'none';
        }
    }
}

export default UIControls;
