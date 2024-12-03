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

        // Find the closest track point to the current location
        let closestIndex = 0;
        let closestDistance = Infinity;

        // Calculate distance to each track point to find closest
        trackPoints.forEach((point, index) => {
            const distance = calculateDistance(
                currentLocation,
                point  // calculateDistance handles array format conversion
            );
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
            progressElement.style.display = 'block'; // Ensure visibility
            progressElement.textContent = `${(remainingDistance / 1000).toFixed(1)} km to go`;
        }

        return {
            closestIndex,
            remainingDistance,
            closestDistance
        };
    }
};

export default progressTracker;
