/**
 * progress-tracker.js
 * Tracks and displays user progress along the GPX track.
 * 
 * Key features:
 * - Calculates distance along track
 * - Updates progress display
 * - Manages progress display visibility
 * - Formats progress information
 */

import trackManager from './track-manager.js';
import { calculateDistance } from './utils.js';

const progressTracker = {

    // Configuration
    lastUpdateTime: 0, // Track when we last did a real update
    updateInterval: 60000, // Update interval in milliseconds (default: 1 minute)
    
    /**
     * Shows the progress display
     */
    showProgressDisplay: function() {
        document.getElementById('progress-display').style.display = 'block';
    },

    /**
     * Hides the progress display
     */
    hideProgressDisplay: function() {
        const progressElement = document.getElementById('progress-display');
        if (progressElement) {
            progressElement.style.display = 'none';
            progressElement.textContent = '';
        }
    },

    

    /**
     * Updates the progress display with new location
     * @param {Object} currentLocation - Current location object with lat/lng
     * @param {Object} map - Mapbox GL JS map instance
     */
    updateProgress: function(currentLocation, map) {
        const now = Date.now();
        // Only update if it's been more than updateInterval milliseconds since last update
        if (now - this.lastUpdateTime < this.updateInterval) {
            return;
        }
        
        const trackPoints = trackManager.trackPoints;
        const trackDistances = trackManager.trackDistances;
        
        if (!trackPoints || trackPoints.length === 0 || !trackDistances) {
            return;
        }

        // Find the closest track point
        let closestIndex = -1;
        let closestDistance = Infinity;

        trackPoints.forEach((point, index) => {
            const distance = calculateDistance(currentLocation, point);
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
     * Formats distance for display
     * @param {number} meters - Distance in meters
     * @returns {string} Formatted distance string
     */
    formatDistance: function(meters) {
        return `${(meters / 1000).toFixed(1)} km`;
    }
};

export default progressTracker;
