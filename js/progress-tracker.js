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
    offTrack: false,
    offTrackThreshold: 50, // meters - distance at which user is considered off track
    
    /**
     * Initialize the progress tracker
     * @param {Object} app - Reference to the app mediator
     */
    init(app) {
        this.app = app;
        this.trackManager = app.trackManager();
        this.geoUtils = app.geoUtils();
        this.lastUpdateTime = 0; // Reset on init
        
        // Set initial text
        const element = this.getProgressDisplayElement();
        if (element) {
            element.textContent = '---';
        }
    },

    getProgressDisplayElement() {
        return document.getElementById(this.progressDisplayId);
    },

    /**
     * Shows the progress display
     */
    showProgressDisplay() {
        const element = this.getProgressDisplayElement();
        if (element) {
            element.textContent = '...';
            // Force an immediate update next time by resetting lastUpdateTime
            this.lastUpdateTime = 0;
        }
    },

    /**
     * Hides the progress display
     */
    hideProgressDisplay() {
        const progressElement = this.getProgressDisplayElement();
        if (progressElement) {
            progressElement.textContent = '---';
            progressElement.classList.remove('off-track');
            this.offTrack = false;
            this.lastUpdateTime = 0;
        }
    },

    updateProgressDisplay(remainingDistanceRounded) {
        // Update distance display
        const progressElement = this.getProgressDisplayElement();
        if (progressElement) {
            progressElement.textContent = `${remainingDistanceRounded} km`;
            // Update lastUpdateTime since we actually updated the display
            this.lastUpdateTime = Date.now();
        }
    },

    /**
     * Updates the progress display with new location
     * @param {GeoPoint} currentLocation - Current location as GeoPoint
     */
    updateProgress(currentLocation) {
        const now = Date.now();
        
        // Skip if not enough time has passed since last update
        if (now - this.lastUpdateTime < this.updateInterval) {
            return;
        }

        if (!this.app || !this.trackManager || !this.trackManager.hasTrack) {
            return;
        }

        // Find the closest track point using track manager
        const closest = this.trackManager.findClosestPoint(currentLocation);
        if (!closest) {
            return;
        }

        // Update distance display with remaining distance
        const remainingDistanceRounded = (closest.remainingDistance / 1000).toFixed(1);
        this.updateProgressDisplay(remainingDistanceRounded);

        // Check if the user is off track
        const distanceFromTrack = closest.point.distanceTo(currentLocation);
        const wasOffTrack = this.offTrack;
        this.offTrack = distanceFromTrack > this.offTrackThreshold;

        // Update visual feedback if off-track status changed
        const progressElement = this.getProgressDisplayElement();
        if (progressElement) {
            if (this.offTrack && !wasOffTrack) {
                progressElement.classList.add('off-track');
            } else if (!this.offTrack && wasOffTrack) {
                progressElement.classList.remove('off-track');
            }
        }
    }
};

export default progressTracker;
