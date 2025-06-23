/**
 * progress-display.js
 * Dedicated progress UI component with event-driven updates
 */

import config from '../core/config.js';

class ProgressDisplay {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.element = null;
        this.isVisible = false;
        this.hasTrack = false;
        this.hasLocation = false;
        this.setupEventListeners();
        this.initElement();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventBus.on('progress:updated', this.handleProgressUpdate, this);
        this.eventBus.on('progress:off-track-changed', this.handleOffTrackChanged, this);
        this.eventBus.on('ui:progress-visibility-changed', this.handleVisibilityChanged, this);
        this.eventBus.on('track:loaded', this.handleTrackLoaded, this);
        this.eventBus.on('track:cleared', this.handleTrackCleared, this);
        this.eventBus.on('location:updated', this.handleLocationUpdated, this);
    }

    /**
     * Initialize DOM element
     */
    initElement() {
        this.element = document.getElementById(config.progress.displayId);
        if (!this.element) {
            console.error(`Progress display element not found: ${config.progress.displayId}`);
            return;
        }

        // Set initial state
        this.element.textContent = '---';
        this.element.classList.remove('off-track');
    }

    /**
     * Handle track loaded
     */
    handleTrackLoaded() {
        this.hasTrack = true;
        this.updateDisplayMessage();
    }

    /**
     * Handle track cleared
     */
    handleTrackCleared() {
        this.hasTrack = false;
        this.hasLocation = false;
    }

    /**
     * Handle location updated
     */
    handleLocationUpdated() {
        this.hasLocation = true;
        this.updateDisplayMessage();
    }

    /**
     * Update display message based on current state
     */
    updateDisplayMessage() {
        if (!this.element || !this.isVisible) return;

        if (this.hasTrack && !this.hasLocation) {
            this.element.textContent = 'GPS...';
        } else if (this.hasTrack && this.hasLocation) {
            // Keep current display - will be updated by progress:updated
            if (this.element.textContent === 'GPS...' || this.element.textContent === '***') {
                this.element.textContent = '***';
            }
        }
    }

    /**
     * Handle progress update
     * @param {Object} data - Progress data
     */
    handleProgressUpdate(data) {
        if (!this.element || !this.isVisible) return;

        const { remainingDistance } = data;
        const remainingKm = (remainingDistance / 1000).toFixed(1);
        this.element.textContent = `${remainingKm} km`;
    }

    /**
     * Handle off-track status change
     * @param {Object} data - Off-track data
     */
    handleOffTrackChanged(data) {
        if (!this.element) return;

        const { isOffTrack } = data;

        if (isOffTrack) {
            this.element.classList.add('off-track');
        } else {
            this.element.classList.remove('off-track');
        }
    }

    /**
     * Handle visibility change
     * @param {Object} data - Visibility data
     */
    handleVisibilityChanged(data) {
        if (!this.element) return;

        const { visible } = data;
        this.isVisible = visible;

        if (visible) {
            this.element.classList.remove('off-track');
            this.updateDisplayMessage();
        } else {
            this.element.textContent = '---';
            this.element.classList.remove('off-track');
            this.hasTrack = false;
            this.hasLocation = false;
        }
    }
}

export default ProgressDisplay;
