/**
 * track-manager.js
 * Manages GPX track loading, display, and interaction.
 */

import GeoPoint from './geo-point.js';

const trackManager = {
    interpolationDistance: 50, // meters
    locationTrackerResumeDelay: 5000, // milliseconds
    
    // Component references
    app: null,
    map: null,
    mapInstance: null,
    locationTracker: null,
    geoUtils: null,
    progressTracker: null,
    uiControls: null,

    trackPoints: [],
    hasTrack: false,

    /**
     * Initialize with app reference and setup track handling
     * @param {Object} app - The app mediator
     */
    init(app) {
        this.app = app;
        this.map = app.map();
        this.mapInstance = this.map.getInstance();
        this.locationTracker = app.locationTracker();
        this.geoUtils = app.geoUtils();
        this.progressTracker = app.progressTracker();
        this.uiControls = app.uiControls();
        this.setupFileInput();
    },

    /**
     * Sets up the GPX file input handler
     */
    setupFileInput() {
        const fileInput = document.getElementById('gpx-file');
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileSelection.bind(this));
        }
    },

    /**
     * Handles GPX file selection
     * @param {Event} e - File input change event
     */
    async handleFileSelection(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const gpxContent = await this.readGPXFile(file);
            await this.processGPXTrack(gpxContent);
        } catch (error) {
            console.error('Error processing GPX file:', error);
            this.hasTrack = false;
            this.updateUI();
        }
    },

    /**
     * Reads a GPX file and returns its content
     * @param {File} file - GPX file to read
     * @returns {Promise<string>} File content
     */
    readGPXFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsText(file);
        });
    },

    /**
     * Processes GPX track data and updates the map
     * @param {string} gpxContent - GPX file content
     */
    async processGPXTrack(gpxContent) {
        const parser = new DOMParser();
        const gpx = parser.parseFromString(gpxContent, 'text/xml');
        
        // Extract track points
        const trackPoints = Array.from(gpx.getElementsByTagName('trkpt')).map(point => {
            const lat = parseFloat(point.getAttribute('lat'));
            const lon = parseFloat(point.getAttribute('lon'));
            return new GeoPoint(lon, lat);
        });

        if (trackPoints.length === 0) {
            console.error('No track points found in GPX file');
            this.hasTrack = false;
            this.updateUI();
            return;
        }

        // Clear existing track first
        this.clearTrack();
        
        this.trackPoints = trackPoints;
        const coordinates = trackPoints.map(point => point.toArray());
        
        // Calculate distances for progress tracking
        this.calculateTrackDistances();
        
        // Update map with track visualization
        this.map.updateTrackVisualization({
            coordinates: coordinates
        });

        this.hasTrack = true;
        this.updateUI();
    },

    /**
     * Clears the current track
     */
    clearTrack() {
        this.trackPoints = [];
        this.map.clearTrackVisualization();
        this.hasTrack = false;
        this.updateUI();
    },

    /**
     * Updates UI elements after track changes
     */
    updateUI() {
        if (this.hasTrack) {
            this.progressTracker.showProgressDisplay();
            this.uiControls.showClearButton();
        } else {
            this.progressTracker.hideProgressDisplay();
            this.uiControls.hideClearButton();
        }
    },

    /**
     * Adds interpolated points to make sure there's a point every X meters
     * @param {Array} coordinates - Array of track coordinates
     * @returns {Array} Interpolated track coordinates
     */
    interpolateTrackPoints(coordinates) {
        const result = [];
        for (let i = 0; i < coordinates.length - 1; i++) {
            const start = coordinates[i];
            const end = coordinates[i + 1];
            result.push(start);

            const distance = this.geoUtils.calculateDistance(
                { lat: start[1], lng: start[0] },
                { lat: end[1], lng: end[0] }
            );

            if (distance > this.interpolationDistance) {
                const steps = Math.floor(distance / this.interpolationDistance);
                for (let j = 1; j < steps; j++) {
                    const fraction = j / steps;
                    const lat = start[1] + (end[1] - start[1]) * fraction;
                    const lng = start[0] + (end[0] - start[0]) * fraction;
                    result.push([lng, lat]);
                }
            }
        }
        if (coordinates.length > 0) {
            result.push(coordinates[coordinates.length - 1]);
        }
        return result;
    },

    /**
     * Calculates cumulative distances for the track
     */
    calculateTrackDistances() {
        let cumulativeDistance = 0;
        
        for (let i = 0; i < this.trackPoints.length; i++) {
            const point = this.trackPoints[i];
            
            if (i > 0) {
                const prevPoint = this.trackPoints[i - 1];
                const distance = this.geoUtils.calculateDistance(
                    prevPoint.toLatLng(),
                    point.toLatLng()
                );
                cumulativeDistance += distance;
            }
            
            point.distanceFromStart = cumulativeDistance;
            point.remainingDistance = 0; // Will be calculated in reverse
        }
        
        // Calculate remaining distances in reverse
        let remainingDistance = 0;
        for (let i = this.trackPoints.length - 1; i >= 0; i--) {
            this.trackPoints[i].remainingDistance = remainingDistance;
            
            if (i > 0) {
                const distance = this.geoUtils.calculateDistance(
                    this.trackPoints[i - 1].toLatLng(),
                    this.trackPoints[i].toLatLng()
                );
                remainingDistance += distance;
            }
        }
    },

    /**
     * Gets the total track distance in meters
     * @returns {number} Total track distance in meters, or 0 if no track is loaded
     */
    getTotalDistance() {
        if (!this.hasTrack || this.trackPoints.length === 0) return 0;
        return this.trackPoints[this.trackPoints.length - 1].distanceFromStart;
    },

    /**
     * Gets the distance covered up to a specific track point
     * @param {number} pointIndex - Index of the track point
     * @returns {number} Distance covered in meters up to this point, or 0 if index is invalid
     */
    getDistanceCovered(pointIndex) {
        if (!this.hasTrack || pointIndex < 0 || pointIndex >= this.trackPoints.length) return 0;
        return this.trackPoints[pointIndex].distanceFromStart;
    },

    /**
     * Gets the remaining distance from a specific track point to the end
     * @param {number} pointIndex - Index of the track point
     * @returns {number} Remaining distance in meters from this point to the end, or 0 if index is invalid
     */
    getRemainingDistance(pointIndex) {
        if (!this.hasTrack || pointIndex < 0 || pointIndex >= this.trackPoints.length) return 0;
        return this.trackPoints[pointIndex].remainingDistance;
    },

    /**
     * Finds the track point closest to the given location
     * @param {GeoPoint} location - Location as GeoPoint
     * @returns {Object|null} Object containing the closest point and its data, or null if no track is loaded
     */
    findClosestPoint(location) {
        if (!this.hasTrack) return null;
        
        const index = this.findClosestPointIndex(location);
        if (index === -1) return null;
        
        return {
            point: this.trackPoints[index],
            index: index,
            distanceFromStart: this.getDistanceCovered(index),
            remainingDistance: this.getRemainingDistance(index)
        };
    },

    /**
     * Finds the index of the track point closest to the given location
     * @param {GeoPoint} location - Location as GeoPoint
     * @returns {number} Index of the closest track point, or -1 if no track is loaded
     */
    findClosestPointIndex(location) {
        if (!this.hasTrack || this.trackPoints.length === 0) return -1;
        
        let minDistance = Infinity;
        let closestIndex = -1;
        
        for (let i = 0; i < this.trackPoints.length; i++) {
            const point = this.trackPoints[i];
            const distance = this.geoUtils.calculateDistance(
                location.toLatLng(),
                point.toLatLng()
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
            }
        }
        
        return closestIndex;
    }
};

export default trackManager;