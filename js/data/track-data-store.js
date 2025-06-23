/**
 * track-data-store.js
 * Centralized track data management with event-driven updates
 */

import config from '../core/config.js';

class TrackDataStore {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.reset();
        this.setupEventListeners();
    }

    /**
     * Reset all track data
     */
    reset() {
        this.trackPoints = [];
        this.hasTrack = false;
        this.totalDistance = 0;
        this.originalPoints = [];
        this.metadata = {
            name: null,
            description: null,
            loadedAt: null,
            source: null
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventBus.on('track:load-requested', this.handleLoadRequest, this);
        this.eventBus.on('track:clear-requested', this.handleClearRequest, this);
    }

    /**
     * Handle track load request
     * @param {Object} data - Contains gpxContent and optional metadata
     */
    async handleLoadRequest(data) {
        try {
            const { gpxContent, source = 'file' } = data;
            await this.loadTrackData(gpxContent, source);
        } catch (error) {
            this.eventBus.emit('track:load-error', { error });
        }
    }

    /**
     * Handle track clear request
     */
    handleClearRequest() {
        this.clearTrack();
    }

    /**
     * Load track data from GPX content
     * @param {string} gpxContent - GPX file content
     * @param {string} source - Source of the track data
     */
    async loadTrackData(gpxContent, source = 'file') {
        const parser = new DOMParser();
        const gpx = parser.parseFromString(gpxContent, 'text/xml');

        // Extract metadata
        const trackElement = gpx.querySelector('trk');
        this.metadata = {
            name: trackElement?.querySelector('name')?.textContent || null,
            description: trackElement?.querySelector('desc')?.textContent || null,
            loadedAt: Date.now(),
            source
        };

        // Extract track points
        const trkpts = Array.from(gpx.getElementsByTagName('trkpt'));
        if (trkpts.length === 0) {
            throw new Error('No track points found in GPX file');
        }

        // Import GeoPoint dynamically to avoid circular dependencies
        const { default: GeoPoint } = await import('../data/geo-point.js');

        this.originalPoints = trkpts.map(point => {
            const lat = parseFloat(point.getAttribute('lat'));
            const lon = parseFloat(point.getAttribute('lon'));
            return new GeoPoint(lon, lat);
        });

        // Interpolate points for consistent spacing
        this.trackPoints = await this.interpolatePoints(this.originalPoints);

        // Calculate distances
        this.calculateDistances();

        this.hasTrack = true;

        // Store in localStorage
        localStorage.setItem(config.storage.keys.lastGpxContent, gpxContent);

        // Emit success event
        this.eventBus.emit('track:loaded', {
            trackPoints: this.trackPoints,
            originalPoints: this.originalPoints,
            totalDistance: this.totalDistance,
            metadata: this.metadata
        });
    }

    /**
     * Clear track data
     */
    clearTrack() {
        this.reset();
        this.eventBus.emit('track:cleared');
    }

    /**
     * Interpolate points for consistent spacing
     * @param {Array} points - Original track points
     * @returns {Array} Interpolated track points
     */
    async interpolatePoints(points) {
        // Import geoUtils dynamically to avoid circular dependencies
        const { default: geoUtils } = await import('../data/geo-utils.js');
        const { default: GeoPoint } = await import('../data/geo-point.js');

        const result = [];
        const interpolationDistance = config.track.interpolation.distance;

        for (let i = 0; i < points.length - 1; i++) {
            const start = points[i];
            const end = points[i + 1];
            result.push(start);

            const distance = geoUtils.calculateDistance(start.toLatLng(), end.toLatLng());

            if (distance > interpolationDistance) {
                const steps = Math.floor(distance / interpolationDistance);
                for (let j = 1; j < steps; j++) {
                    const fraction = j / steps;
                    const lng = start.lng + (end.lng - start.lng) * fraction;
                    const lat = start.lat + (end.lat - start.lat) * fraction;
                    result.push(new GeoPoint(lng, lat));
                }
            }
        }

        if (points.length > 0) {
            result.push(points[points.length - 1]);
        }

        return result;
    }

    /**
     * Calculate cumulative and remaining distances for all points
     */
    async calculateDistances() {
        // Import geoUtils dynamically to avoid circular dependencies
        const { default: geoUtils } = await import('../data/geo-utils.js');

        let cumulativeDistance = 0;

        // Calculate cumulative distances
        for (let i = 0; i < this.trackPoints.length; i++) {
            const point = this.trackPoints[i];

            if (i > 0) {
                const prevPoint = this.trackPoints[i - 1];
                const distance = geoUtils.calculateDistance(
                    prevPoint.toLatLng(),
                    point.toLatLng()
                );
                cumulativeDistance += distance;
            }

            point.distanceFromStart = cumulativeDistance;
        }

        this.totalDistance = cumulativeDistance;

        // Calculate remaining distances in reverse
        let remainingDistance = 0;
        for (let i = this.trackPoints.length - 1; i >= 0; i--) {
            this.trackPoints[i].remainingDistance = remainingDistance;

            if (i > 0) {
                const distance = geoUtils.calculateDistance(
                    this.trackPoints[i - 1].toLatLng(),
                    this.trackPoints[i].toLatLng()
                );
                remainingDistance += distance;
            }
        }
    }

    /**
     * Find the closest point to a given location
     * @param {GeoPoint} location - Location to find closest point to
     * @returns {Object|null} Closest point data or null
     */
    async findClosestPoint(location) {
        if (!location || !this.hasTrack || this.trackPoints.length === 0) return null;

        // Import geoUtils dynamically to avoid circular dependencies
        const { default: geoUtils } = await import('../data/geo-utils.js');

        let minDistance = Infinity;
        let closestIndex = -1;

        for (let i = 0; i < this.trackPoints.length; i++) {
            const point = this.trackPoints[i];
            const distance = geoUtils.calculateDistance(
                location.toLatLng(),
                point.toLatLng()
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
            }
        }

        if (closestIndex === -1) return null;

        return {
            point: this.trackPoints[closestIndex],
            index: closestIndex,
            distanceFromStart: this.trackPoints[closestIndex].distanceFromStart,
            remainingDistance: this.trackPoints[closestIndex].remainingDistance,
            distanceFromTrack: minDistance
        };
    }

    /**
     * Get current track data
     * @returns {Object} Current track data
     */
    getTrackData() {
        return {
            trackPoints: this.trackPoints,
            originalPoints: this.originalPoints,
            hasTrack: this.hasTrack,
            totalDistance: this.totalDistance,
            metadata: this.metadata
        };
    }
}

export default TrackDataStore;
