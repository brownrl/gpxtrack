/**
 * progress-tracker.js
 * Tracks and displays user progress along the GPX track.
 */

const progressTracker = {
    // Configuration
    lastUpdateTime: 0, // Track when we last did a real update
    updateInterval: 60000, // Update interval in milliseconds (default: 1 minute)
    
    // Component references
    app: null,
    trackManager: null,
    geoUtils: null,
    progressDisplayId: 'progress-display',
    
    /**
     * Initialize the progress tracker
     * @param {Object} app - Reference to the app mediator
     */
    init(app) {
        this.app = app;
        this.trackManager = app.trackManager();
        this.geoUtils = app.geoUtils();
    },

    getProgressDisplayElement() {
        return document.getElementById(this.progressDisplayId);
    },

    /**
     * Shows the progress display
     */
    showProgressDisplay() {
        this.getProgressDisplayElement().style.display = 'block';
        this.lastUpdateTime = 0;
    },

    /**
     * Hides the progress display
     */
    hideProgressDisplay() {
        const progressElement = this.getProgressDisplayElement();
        if (progressElement) {
            progressElement.style.display = 'none';
            progressElement.textContent = '';
            this.lastUpdateTime = 0;
        }
    },

    updateProgressDisplay(remainingDistanceRounded) {
        // Update distance display
        const progressElement = this.getProgressDisplayElement();
        if (progressElement) {
            progressElement.textContent = `${remainingDistanceRounded} km`;
        }
    },

    /**
     * Updates the progress display with new location
     * @param {Object} currentLocation - Current location object with lat/lng
     */
    updateProgress(currentLocation) {
        const now = Date.now();
        // Only update if it's been more than updateInterval milliseconds since last update
        if (now - this.lastUpdateTime < this.updateInterval) {
            return;
        }

        if (!this.app || !this.trackManager) {
            return;
        }

        const trackPoints = this.trackManager.trackPoints;
        if (!trackPoints || trackPoints.length === 0) {
            return;
        }

        // Find the closest track point using track manager
        const closestIndex = this.trackManager.findClosestPointIndex(currentLocation);
        if (closestIndex === -1) {
            return;
        }

        // Get remaining distance using track manager's helper method
        const remainingDistance = this.trackManager.getRemainingDistance(closestIndex);
        const remainingDistanceRounded = (remainingDistance / 1000).toFixed(1);

        // Update distance display
        this.updateProgressDisplay(remainingDistanceRounded);

        // Update the last update time
        this.lastUpdateTime = now;
    },

    /**
     * Calculates distance between two points
     * @param {Object} point1 - First point with lat/lng
     * @param {Object} point2 - Second point with lat/lng
     * @returns {number} Distance in meters
     */
    calculateDistance(point1, point2) {
        return this.geoUtils.calculateDistance(point1, point2);
    }
};

export default progressTracker;
