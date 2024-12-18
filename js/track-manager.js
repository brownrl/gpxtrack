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

    trackPoints: [],

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
            return;
        }

        this.trackPoints = trackPoints;
        const coordinates = trackPoints.map(point => point.toArray());
        
        // Clear existing track
        this.clearTrack();
        
        // Update map with new track
        this.map.updateTrackVisualization({ coordinates });
        
        // Calculate distances
        this.calculateTrackDistances();
        
        // Update UI
        this.updateUI();
    },

    /**
     * Clears the current track
     */
    clearTrack() {
        this.trackPoints = [];
        this.map.clearTrackVisualization();
    },

    /**
     * Updates UI elements after track processing
     */
    updateUI() {
        const totalDistance = this.getTotalDistance();
        const distanceElement = document.getElementById('total-distance');
        if (distanceElement) {
            distanceElement.textContent = `Total Distance: ${(totalDistance / 1000).toFixed(2)} km`;
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
            
            const startPoint = new GeoPoint(start[0], start[1]);
            const endPoint = new GeoPoint(end[0], end[1]);
            const distance = startPoint.distanceTo(endPoint);
            
            if (distance > this.interpolationDistance) {
                const numPoints = Math.floor(distance / this.interpolationDistance);
                for (let j = 1; j < numPoints; j++) {
                    const fraction = j / numPoints;
                    const lat = start[1] + (end[1] - start[1]) * fraction;
                    const lng = start[0] + (end[0] - start[0]) * fraction;
                    result.push([lng, lat]);
                }
            }
        }
        result.push(coordinates[coordinates.length - 1]);
        return result;
    },

    /**
     * Calculates cumulative distances for the track
     */
    calculateTrackDistances() {
        if (this.trackPoints.length === 0) return;

        let cumulativeDistance = 0;
        this.trackPoints[0].distanceFromStart = 0;
        
        for (let i = 1; i < this.trackPoints.length; i++) {
            const distance = this.trackPoints[i].distanceTo(this.trackPoints[i - 1]);
            cumulativeDistance += distance;
            this.trackPoints[i].distanceFromStart = cumulativeDistance;
        }

        const totalDistance = cumulativeDistance;
        for (let i = 0; i < this.trackPoints.length; i++) {
            this.trackPoints[i].remainingDistance = totalDistance - this.trackPoints[i].distanceFromStart;
        }
    },

    /**
     * Gets the total track distance in meters
     * @returns {number} Total track distance in meters, or 0 if no track is loaded
     */
    getTotalDistance() {
        if (this.trackPoints.length === 0) return 0;
        return this.trackPoints[this.trackPoints.length - 1].distanceFromStart;
    },

    /**
     * Gets the distance covered up to a specific track point
     * @param {number} pointIndex - Index of the track point
     * @returns {number} Distance covered in meters up to this point, or 0 if index is invalid
     */
    getDistanceCovered(pointIndex) {
        if (pointIndex < 0 || pointIndex >= this.trackPoints.length) return 0;
        return this.trackPoints[pointIndex].distanceFromStart;
    },

    /**
     * Gets the remaining distance from a specific track point to the end
     * @param {number} pointIndex - Index of the track point
     * @returns {number} Remaining distance in meters from this point to the end, or 0 if index is invalid
     */
    getRemainingDistance(pointIndex) {
        if (pointIndex < 0 || pointIndex >= this.trackPoints.length) return 0;
        return this.trackPoints[pointIndex].remainingDistance;
    },

    /**
     * Checks if a track is currently loaded
     * @returns {boolean} True if a track is loaded, false otherwise
     */
    hasTrack() {
        return this.trackPoints.length > 0;
    },

    /**
     * Finds the track point closest to the given location
     * @param {GeoPoint} location - Location as GeoPoint
     * @returns {Object|null} Object containing the closest point and its data, or null if no track is loaded
     */
    findClosestPoint(location) {
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
        if (!this.hasTrack()) return -1;

        let minDistance = Infinity;
        let closestIndex = -1;

        this.trackPoints.forEach((point, index) => {
            const distance = location.distanceTo(point);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        return closestIndex;
    }
};

export default trackManager;