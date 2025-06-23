/**
 * progress-tracker.js
 * Business logic for progress calculations and tracking
 */

import config from '../core/config.js';

class ProgressTracker {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.lastUpdateTime = 0;
        this.isOffTrack = false;
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventBus.on('location:updated', this.handleLocationUpdate, this);
        this.eventBus.on('track:cleared', this.handleTrackCleared, this);
        this.eventBus.on('track:loaded', this.handleTrackLoaded, this);
    }

    /**
     * Handle location update
     * @param {Object} data - Location data
     */
    async handleLocationUpdate(data) {
        const { location } = data;
        if (!location) return; // Skip if no location available
        await this.updateProgress(location);
    }

    /**
     * Handle track loaded - try to calculate initial progress if location is available
     */
    async handleTrackLoaded() {
        // Request current location and try to calculate progress immediately
        this.eventBus.emit('location:update-requested');
        
        // Also try to get current location directly and calculate progress
        try {
            // We'll emit a request for immediate progress calculation
            this.eventBus.emit('progress:calculate-immediate');
        } catch (error) {
            console.error('Error requesting immediate progress calculation:', error);
        }
    }

    /**
     * Handle track cleared
     */
    handleTrackCleared() {
        this.reset();
    }

    /**
     * Reset progress tracker state
     */
    reset() {
        this.lastUpdateTime = 0;
        this.isOffTrack = false;
    }

    /**
     * Update progress based on current location
     * @param {GeoPoint} currentLocation - Current location
     */
    async updateProgress(currentLocation) {
        if (!currentLocation) return; // Skip if no location

        const now = Date.now();

        // Skip if not enough time has passed since last update
        if (now - this.lastUpdateTime < config.progress.updateInterval) {
            return;
        }

        try {
            // Get track data from data store
            const { default: TrackDataStore } = await import('../data/track-data-store.js');

            // We need to get the track data store instance through the event bus
            // For now, we'll emit a request and handle the response
            this.eventBus.emit('progress:track-data-requested', {
                location: currentLocation,
                requestId: Date.now()
            });

        } catch (error) {
            console.error('Error updating progress:', error);
        }
    }

    /**
     * Calculate progress based on track data
     * @param {GeoPoint} location - Current location
     * @param {Object} trackDataStore - Track data store instance
     */
    async calculateProgress(location, trackDataStore) {
        const closest = await trackDataStore.findClosestPoint(location);
        if (!closest) return;

        const { remainingDistance, distanceFromTrack } = closest;

        // Update progress
        this.eventBus.emit('progress:updated', {
            remainingDistance,
            distanceFromTrack,
            closestPoint: closest.point,
            pointIndex: closest.index
        });

        // Check off-track status
        const wasOffTrack = this.isOffTrack;
        this.isOffTrack = distanceFromTrack > config.progress.offTrackThreshold;

        if (wasOffTrack !== this.isOffTrack) {
            this.eventBus.emit('progress:off-track-changed', {
                isOffTrack: this.isOffTrack,
                distanceFromTrack
            });
        }

        this.lastUpdateTime = Date.now();
    }
}

export default ProgressTracker;
