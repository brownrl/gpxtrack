/**
 * location-data-store.js
 * Centralized location data management with event-driven updates
 */

import GeoPoint from './geo-point.js';
import geoUtils from './geo-utils.js';
import config from '../core/config.js';

class LocationDataStore {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.reset();
        this.setupEventListeners();
    }

    /**
     * Reset all location data
     */
    reset() {
        this.currentLocation = null;
        this.previousLocation = null;
        this.locationHistory = [];
        this.heading = null;
        this.accuracy = null;
        this.isTracking = false;
        this.lastUpdateTime = 0;

        // Timed update system (like legacy)
        this.latestGPSLocation = null; // Store latest GPS reading
        this.lastMapUpdateLocation = null; // Last location sent to map

        // Clear timer
        this.stopUpdateCycle();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventBus.on('location:raw-update', this.handleRawLocationUpdate, this);
        this.eventBus.on('location:start-tracking', this.handleStartTracking, this);
        this.eventBus.on('location:stop-tracking', this.handleStopTracking, this);
    }

    /**
     * Handle raw location update from GPS
     * @param {Object} data - Contains position data
     */
    handleRawLocationUpdate(data) {
        if (!this.isTracking) return;

        const { position } = data;

        // Create GeoPoint from position
        const geoPoint = GeoPoint.fromPosition(position);

        // Store latest GPS reading (like legacy currentLocation)
        this.latestGPSLocation = geoPoint;
        this.accuracy = geoPoint.accuracy;
    }

    /**
     * Handle start tracking request
     */
    handleStartTracking() {
        this.isTracking = true;
        this.startUpdateCycle(); // Start timed updates like legacy
        this.eventBus.emit('location:tracking-started');
    }

    /**
     * Handle stop tracking request
     */
    handleStopTracking() {
        this.isTracking = false;
        this.stopUpdateCycle(); // Stop timed updates
        this.eventBus.emit('location:tracking-stopped');
    }

    /**
     * Start the timed update cycle (like legacy)
     */
    startUpdateCycle() {
        // Clear any existing timer
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }

        // Start new update cycle every 5 seconds like legacy
        this.updateTimer = setInterval(() => {
            this.updateMapWithCurrentLocation();
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
     * Update map with current location (like legacy updateMap)
     */
    updateMapWithCurrentLocation() {
        if (!this.latestGPSLocation) return;

        // Store previous location for heading calculation
        this.previousLocation = this.lastMapUpdateLocation;
        this.currentLocation = this.latestGPSLocation;
        this.lastUpdateTime = Date.now();

        // Calculate heading if we have previous location and sufficient movement
        let heading = null;
        if (this.previousLocation) {
            const distance = this.currentLocation.distanceTo(this.previousLocation);
            const minimumDistance = config.location.tracking.minimumDistanceForHeadings;

            if (distance >= minimumDistance) {
                this.heading = geoUtils.calculateBearing(
                    this.previousLocation.toLatLng(),
                    this.currentLocation.toLatLng()
                );
                heading = this.heading;
            }
        }

        // Store current location as last map update location
        this.lastMapUpdateLocation = this.currentLocation;

        // Add to history (keep last 100 points)
        this.locationHistory.push({
            location: this.currentLocation,
            heading: this.heading,
            timestamp: Date.now()
        });

        if (this.locationHistory.length > 100) {
            this.locationHistory.shift();
        }

        // Emit location update event (like legacy)
        this.eventBus.emit('location:updated', {
            location: this.currentLocation,
            previousLocation: this.previousLocation,
            heading: heading, // Use calculated heading, not stored heading
            accuracy: this.accuracy,
            timestamp: this.lastUpdateTime
        });
    }

    /**
     * Get current location data
     * @returns {Object} Current location data
     */
    getLocationData() {
        return {
            currentLocation: this.currentLocation,
            previousLocation: this.previousLocation,
            heading: this.heading,
            accuracy: this.accuracy,
            isTracking: this.isTracking,
            lastUpdateTime: this.lastUpdateTime,
            locationHistory: [...this.locationHistory] // Return copy
        };
    }

    /**
     * Get current location as GeoPoint
     * @returns {GeoPoint|null} Current location or null
     */
    getCurrentLocation() {
        return this.currentLocation;
    }

    /**
     * Check if currently tracking
     * @returns {boolean} Whether location tracking is active
     */
    isLocationTracking() {
        return this.isTracking;
    }
}

export default LocationDataStore;
