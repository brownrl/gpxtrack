/**
 * location-tracker.js
 * GPS location tracking service - purely handles GPS data acquisition
 */

import config from '../core/config.js';

class LocationTracker {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.watchId = null;
        this.updateTimer = null;
        this.isPaused = false;
        this.isTracking = false;
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventBus.on('location:start-tracking-requested', this.handleStartTracking, this);
        this.eventBus.on('location:stop-tracking-requested', this.handleStopTracking, this);
        this.eventBus.on('location:pause-requested', this.handlePauseRequest, this);
        this.eventBus.on('location:resume-requested', this.handleResumeRequest, this);
        this.eventBus.on('location:refresh-requested', this.handleRefreshRequest, this);
    }

    /**
     * Handle start tracking request
     */
    handleStartTracking() {
        this.startLocationTracking();
    }

    /**
     * Handle stop tracking request
     */
    handleStopTracking() {
        this.stopLocationTracking();
    }

    /**
     * Handle pause request
     */
    handlePauseRequest() {
        this.isPaused = true;
    }

    /**
     * Handle resume request
     */
    handleResumeRequest() {
        this.isPaused = false;
        this.triggerLocationUpdate();
    }

    /**
     * Handle refresh request (re-emit current location)
     */
    handleRefreshRequest() {
        this.triggerLocationUpdate();
    }

    /**
     * Start location tracking
     */
    startLocationTracking() {
        if (this.isTracking) return;

        // Emit tracking start event
        this.eventBus.emit('location:start-tracking');

        if (!("geolocation" in navigator)) {
            this.eventBus.emit('location:error', {
                error: new Error('Geolocation not supported'),
                message: 'Geolocation is not supported by this browser'
            });
            return;
        }

        // Start continuous location watching
        this.watchId = navigator.geolocation.watchPosition(
            this.handlePositionUpdate.bind(this),
            this.handleLocationError.bind(this),
            config.location.tracking.options
        );

        // Start update cycle
        this.startUpdateCycle();
        this.isTracking = true;

        this.eventBus.emit('location:tracking-started');
    }

    /**
     * Stop location tracking
     */
    stopLocationTracking() {
        if (!this.isTracking) return;

        // Stop geolocation watching
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        // Stop update cycle
        this.stopUpdateCycle();
        this.isTracking = false;

        this.eventBus.emit('location:tracking-stopped');
    }

    /**
     * Start the update cycle
     */
    startUpdateCycle() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }

        this.updateTimer = setInterval(() => {
            this.triggerLocationUpdate();
        }, config.location.tracking.updateInterval);
    }

    /**
     * Stop the update cycle
     */
    stopUpdateCycle() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    /**
     * Handle raw position update from geolocation API
     * @param {GeolocationPosition} position - Browser geolocation position
     */
    handlePositionUpdate(position) {
        // Emit raw location update for data store to process
        this.eventBus.emit('location:raw-update', {
            position,
            timestamp: Date.now()
        });
    }

    /**
     * Trigger location update (for periodic updates)
     */
    triggerLocationUpdate() {
        if (!this.isPaused && this.isTracking) {
            // Request current location data and emit update
            this.eventBus.emit('location:update-requested');
        }
    }

    /**
     * Handle location error
     * @param {GeolocationPositionError} error - Geolocation error
     */
    handleLocationError(error) {
        let message = 'Location error occurred';

        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = 'Location access denied by user';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location information unavailable';
                break;
            case error.TIMEOUT:
                message = 'Location request timed out';
                break;
        }

        this.eventBus.emit('location:error', {
            error,
            message,
            code: error.code
        });
    }

    /**
     * Check if currently tracking
     * @returns {boolean} Whether location tracking is active
     */
    isLocationTracking() {
        return this.isTracking;
    }

    /**
     * Check if currently paused
     * @returns {boolean} Whether location tracking is paused
     */
    isLocationPaused() {
        return this.isPaused;
    }
}

export default LocationTracker;
