/**
 * geo-utils.js
 * Pure geographic utility functions for calculations and conversions.
 */

const geoUtils = {

    /**
     * Calculates the bearing between two points
     * @param {Array|Object} start - Starting point as either:
     *                              - Array: [longitude, latitude]
     *                              - Object: {lng: longitude, lat: latitude}
     * @param {Array|Object} end - Ending point in same format as start
     * @returns {number} Bearing in degrees (0-360)
     */
    calculateBearing(start, end) {
        // Handle both array and object formats
        const lon1 = Array.isArray(start) ? start[0] : start.lng;
        const lat1 = Array.isArray(start) ? start[1] : start.lat;
        const lon2 = Array.isArray(end) ? end[0] : end.lng;
        const lat2 = Array.isArray(end) ? end[1] : end.lat;

        // Convert to radians
        const startLat = lat1 * Math.PI / 180;
        const startLng = lon1 * Math.PI / 180;
        const destLat = lat2 * Math.PI / 180;
        const destLng = lon2 * Math.PI / 180;

        const y = Math.sin(destLng - startLng) * Math.cos(destLat);
        const x = Math.cos(startLat) * Math.sin(destLat) -
            Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
        let bearing = Math.atan2(y, x) * 180 / Math.PI;
        bearing = (bearing + 360) % 360;

        return bearing;
    },

    /**
     * Calculates the distance between two points using the Haversine formula
     * @param {Array|Object} start - Starting point as either:
     *                              - Array: [longitude, latitude]
     *                              - Object: {lng: longitude, lat: latitude}
     * @param {Array|Object} end - Ending point in same format as start
     * @returns {number} Distance in meters
     */
    calculateDistance(start, end) {
        // Handle both array and object formats
        const lon1 = Array.isArray(start) ? start[0] : start.lng;
        const lat1 = Array.isArray(start) ? start[1] : start.lat;
        const lon2 = Array.isArray(end) ? end[0] : end.lng;
        const lat2 = Array.isArray(end) ? end[1] : end.lat;

        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
};

export default geoUtils;
