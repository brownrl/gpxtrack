/**
 * ui-state-manager.js
 * Centralized UI state management with event-driven updates
 */

import config from '../core/config.js';

class UIStateManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.reset();
        this.setupEventListeners();
    }

    /**
     * Reset all UI state
     */
    reset() {
        this.state = {
            controlsVisible: true,
            controlsAutoHide: true,
            buttonsVisible: {
                clear: false,
                zoom: false,
                reload: false,
                wake: false
            },
            drawerExpanded: false,
            progressVisible: false,
            locationOverlayVisible: true
        };
        this.hideTimeout = null;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Track events
        this.eventBus.on('track:loaded', this.handleTrackLoaded, this);
        this.eventBus.on('track:cleared', this.handleTrackCleared, this);

        // Location events
        this.eventBus.on('location:updated', this.handleLocationUpdated, this);
        this.eventBus.on('location:tracking-started', this.handleLocationTrackingStarted, this);

        // UI interaction events
        this.eventBus.on('ui:user-interaction', this.handleUserInteraction, this);
        this.eventBus.on('ui:drawer-toggle', this.handleDrawerToggle, this);
        this.eventBus.on('ui:drawer-close', this.handleDrawerClose, this);
    }

    /**
     * Handle track loaded
     */
    handleTrackLoaded() {
        this.updateState({
            buttonsVisible: {
                ...this.state.buttonsVisible,
                clear: true,
                zoom: true,
                reload: false,
                wake: true
            },
            progressVisible: true
        });
    }

    /**
     * Handle track cleared
     */
    handleTrackCleared() {
        const hasStoredTrack = !!localStorage.getItem(config.storage.keys.lastGpxContent);

        this.updateState({
            buttonsVisible: {
                clear: false,
                zoom: false,
                reload: hasStoredTrack,
                wake: false
            },
            progressVisible: false
        });
    }

    /**
     * Handle location updated
     */
    handleLocationUpdated() {
        if (this.state.locationOverlayVisible) {
            this.updateState({
                locationOverlayVisible: false
            });
        }
    }

    /**
     * Handle location tracking started
     */
    handleLocationTrackingStarted() {
        this.updateState({
            locationOverlayVisible: true
        });
    }

    /**
     * Handle user interaction
     */
    handleUserInteraction() {
        this.showControlsWithAutoHide();
    }

    /**
     * Handle drawer toggle
     */
    handleDrawerToggle() {
        this.updateState({
            drawerExpanded: !this.state.drawerExpanded
        });

        // Cancel auto-hide when drawer is open
        if (this.state.drawerExpanded) {
            this.clearHideTimeout();
        } else {
            this.showControlsWithAutoHide();
        }
    }

    /**
     * Handle drawer close
     */
    handleDrawerClose() {
        this.updateState({
            drawerExpanded: false
        });
        this.showControlsWithAutoHide();
    }

    /**
     * Update UI state and emit events
     * @param {Object} newState - State changes to apply
     */
    updateState(newState) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };

        // Emit specific change events
        this.emitStateChanges(oldState, this.state);

        // Emit general state change event
        this.eventBus.emit('ui:state-changed', {
            oldState,
            newState: this.state,
            changes: newState
        });
    }

    /**
     * Emit specific state change events
     * @param {Object} oldState - Previous state
     * @param {Object} newState - New state
     */
    emitStateChanges(oldState, newState) {
        // Controls visibility
        if (oldState.controlsVisible !== newState.controlsVisible) {
            this.eventBus.emit('ui:controls-visibility-changed', {
                visible: newState.controlsVisible
            });
        }

        // Button visibility changes
        Object.keys(newState.buttonsVisible || {}).forEach(buttonName => {
            if (oldState.buttonsVisible[buttonName] !== newState.buttonsVisible[buttonName]) {
                this.eventBus.emit('ui:button-visibility-changed', {
                    button: buttonName,
                    visible: newState.buttonsVisible[buttonName]
                });
            }
        });

        // Drawer state
        if (oldState.drawerExpanded !== newState.drawerExpanded) {
            this.eventBus.emit('ui:drawer-state-changed', {
                expanded: newState.drawerExpanded
            });
        }

        // Progress visibility
        if (oldState.progressVisible !== newState.progressVisible) {
            this.eventBus.emit('ui:progress-visibility-changed', {
                visible: newState.progressVisible
            });
        }

        // Location overlay visibility
        if (oldState.locationOverlayVisible !== newState.locationOverlayVisible) {
            this.eventBus.emit('ui:location-overlay-visibility-changed', {
                visible: newState.locationOverlayVisible
            });
        }
    }

    /**
     * Show controls with auto-hide timeout
     */
    showControlsWithAutoHide() {
        this.clearHideTimeout();

        this.updateState({
            controlsVisible: true
        });

        if (this.state.controlsAutoHide && !this.state.drawerExpanded) {
            this.hideTimeout = setTimeout(() => {
                this.updateState({
                    controlsVisible: false
                });
            }, config.ui.hideTimeout);
        }
    }

    /**
     * Clear the auto-hide timeout
     */
    clearHideTimeout() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }

    /**
     * Get current UI state
     * @returns {Object} Current UI state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Check if a button should be visible
     * @param {string} buttonName - Name of the button
     * @returns {boolean} Whether the button should be visible
     */
    isButtonVisible(buttonName) {
        return this.state.buttonsVisible[buttonName] || false;
    }
}

export default UIStateManager;
