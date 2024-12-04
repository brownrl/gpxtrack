import trackManager from './track-manager.js';
import { calculateDistance } from './utils.js';

// Progress tracking functionality
const progressTracker = {
    // Update progress along the track
    updateProgress: function(currentLocation, map) {
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

        return {
            closestIndex,
            remainingDistance,
            closestDistance,
            isOffTrack: false
        };
    }
};

export default progressTracker;
