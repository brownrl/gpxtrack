/**
 * geo-utils.js
 * Geographic utility component for calculations and conversions.
 */

const geoUtils = {
    app: null,

    /**
     * Initialize the geo utils component
     * @param {Object} app - Reference to the app mediator
     */
    init(app) {
        this.app = app;
    },

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

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    },

    /**
     * Creates a chevron icon for direction indicators
     * @param {number} bearing - Bearing in degrees
     * @returns {mapboxgl.Marker} Chevron icon marker
     */
    createChevronIcon(bearing) {
        // Get the map instance from the map component
        const map = this.app.map().getInstance();
        if (!map) return null;

        return new mapboxgl.Marker({
            color: 'blue',
            draggable: false,
            rotation: bearing
        });
    },

    /**
     * Formats a distance in meters to a human-readable string
     * @param {number} meters - Distance in meters
     * @returns {string} Formatted distance (e.g., "1.2 km" or "800 m")
     */
    formatDistance(meters) {
        if (meters >= 1000) {
            return `${(meters / 1000).toFixed(1)} km`;
        }
        return `${Math.round(meters)} m`;
    },

    /**
     * Converts coordinates to a consistent format
     * @param {Array|Object} coords - Coordinates in array [lon, lat] or object {lng, lat} format
     * @returns {Object} Coordinates in {lng, lat} format
     */
    normalizeCoordinates(coords) {
        if (Array.isArray(coords)) {
            return { lng: coords[0], lat: coords[1] };
        }
        return coords;
    },

    /**
     * Interpolates a point at a specific distance along a line segment
     * @param {Array|Object} point1 - Starting point as either:
     *                              - Array: [longitude, latitude]
     *                              - Object: {lng: longitude, lat: latitude}
     * @param {Array|Object} point2 - Ending point in same format as point1
     * @param {Number} fraction - Fraction of the distance to interpolate (0-1)
     * @returns {Object} Interpolated point as {lng, lat}
     */
    interpolatePoint(point1, point2, fraction) {
        // Handle both array and object formats
        const lon1 = Array.isArray(point1) ? point1[0] : point1.lng;
        const lat1 = Array.isArray(point1) ? point1[1] : point1.lat;
        const lon2 = Array.isArray(point2) ? point2[0] : point2.lng;
        const lat2 = Array.isArray(point2) ? point2[1] : point2.lat;
        
        // Simple linear interpolation
        const lng = lon1 + (lon2 - lon1) * fraction;
        const lat = lat1 + (lat2 - lat1) * fraction;
        
        return { lng, lat };
    },
};

export default geoUtils;
