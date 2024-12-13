/**
 * progress-tracker.js
 * Tracks and displays user progress along the GPX track.
 */

const progressTracker = {
    // Configuration
    lastUpdateTime: 0, // Track when we last did a real update
    updateInterval: 60000, // Update interval in milliseconds (default: 1 minute)
    app: null, // Reference to the app mediator
    
    /**
     * Initialize the progress tracker
     * @param {Object} app - Reference to the app mediator
     */
    init(app) {
        this.app = app;
    },

    /**
     * Shows the progress display
     */
    showProgressDisplay() {
        document.getElementById('progress-display').style.display = 'block';
    },

    /**
     * Hides the progress display
     */
    hideProgressDisplay() {
        const progressElement = document.getElementById('progress-display');
        if (progressElement) {
            progressElement.style.display = 'none';
            progressElement.textContent = '';
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

        const trackManager = this.app.trackManager();
        const map = this.app.map().getInstance();
        
        const trackPoints = trackManager.trackPoints;
        const trackDistances = trackManager.trackDistances;
        
        if (!trackPoints || trackPoints.length === 0 || !trackDistances) {
            return;
        }

        // Find the closest track point
        let closestIndex = -1;
        let closestDistance = Infinity;

        trackPoints.forEach((point, index) => {
            const distance = this.calculateDistance(currentLocation, point);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        // Get remaining distance from track manager's pre-calculated distances
        const totalDistance = trackDistances[trackDistances.length - 1];
        const distanceCovered = trackDistances[closestIndex];
        const remainingDistance = totalDistance - distanceCovered;

        // Update distance display
        const progressElement = document.getElementById('progress-display');
        if (progressElement) {
            progressElement.textContent = `${(remainingDistance / 1000).toFixed(1)} km`;
        }

        // Update the last update time
        this.lastUpdateTime = now;

        return {
            closestIndex,
            remainingDistance,
            closestDistance,
            isOffTrack: false
        };
    },

    /**
     * Calculates distance between two points
     * @param {Object} point1 - First point with lat/lng
     * @param {Object} point2 - Second point with lat/lng
     * @returns {number} Distance in meters
     */
    calculateDistance(point1, point2) {
        return this.app.geoUtils().calculateDistance(point1, point2);
    }
};

export default progressTracker;
