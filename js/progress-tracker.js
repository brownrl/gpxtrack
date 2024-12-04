import trackManager from './track-manager.js';
import { calculateDistance } from './utils.js';

// Progress tracking functionality
const progressTracker = {
    // Configuration
    searchBoxMeters: 400, // Size of the square search box in meters

    // Update progress along the track
    updateProgress: function(currentLocation, map) {
        const trackPoints = trackManager.trackPoints;
        const trackDistances = trackManager.trackDistances;
        
        if (!trackPoints || trackPoints.length === 0 || !trackDistances) {
            return;
        }

        // Convert meters to rough lat/lng degrees (1 degree ≈ 111km)
        const boxDegrees = this.searchBoxMeters / 111000;
        
        // Find track points within the square box
        const nearbyPoints = [];
        const nearbyIndices = [];
        
        trackPoints.forEach((point, index) => {
            if (Math.abs(point.lat - currentLocation.lat) <= boxDegrees && 
                Math.abs(point.lng - currentLocation.lng) <= boxDegrees) {
                nearbyPoints.push(point);
                nearbyIndices.push(index);
            }
        });

        // If no nearby points found, show off-track status
        if (nearbyPoints.length === 0) {
            const progressElement = document.getElementById('progress-display');
            if (progressElement) {
                progressElement.textContent = 'Off track';
            }
            return {
                closestIndex: -1,
                remainingDistance: -1,
                closestDistance: -1,
                isOffTrack: true
            };
        }

        // Find the closest track point among nearby points
        let closestIndex = -1;
        let closestDistance = Infinity;

        nearbyPoints.forEach((point, arrayIndex) => {
            const distance = calculateDistance(currentLocation, point);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = nearbyIndices[arrayIndex];
            }
        });

        // Get remaining distance from track manager's pre-calculated distances
        const totalDistance = trackDistances[trackDistances.length - 1];
        const distanceCovered = trackDistances[closestIndex];
        const remainingDistance = totalDistance - distanceCovered;

        // Update distance display
        const progressElement = document.getElementById('progress-display');
        if (progressElement) {
            progressElement.textContent = `${(remainingDistance / 1000).toFixed(1)} km to go`;
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
