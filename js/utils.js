/**
 * utils.js
 * Utility functions for calculations and conversions.
 * 
 * Key features:
 * - Geographic calculations (distance, bearing)
 * - Unit conversions
 * - Coordinate transformations
 * 
 * Input formats supported:
 * 1. Array format: [longitude, latitude]
 * 2. Object format: {lng: longitude, lat: latitude}
 */

/**
 * Calculates the bearing between two points
 * @param {Array|Object} start - Starting point as either:
 *                              - Array: [longitude, latitude]
 *                              - Object: {lng: longitude, lat: latitude}
 * @param {Array|Object} end - Ending point in same format as start
 * @returns {number} Bearing in degrees (0-360)
 * @example
 * // Array format
 * calculateBearing([0, 0], [1, 1])
 * // Object format
 * calculateBearing({lng: 0, lat: 0}, {lng: 1, lat: 1})
 */
export function calculateBearing(start, end) {
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
}

/**
 * Calculates the distance between two points using the Haversine formula
 * @param {Array|Object} start - Starting point as either:
 *                              - Array: [longitude, latitude]
 *                              - Object: {lng: longitude, lat: latitude}
 * @param {Array|Object} end - Ending point in same format as start
 * @returns {number} Distance in meters
 * @example
 * // Array format
 * calculateDistance([0, 0], [1, 1])
 * // Object format
 * calculateDistance({lng: 0, lat: 0}, {lng: 1, lat: 1})
 */
export function calculateDistance(start, end) {
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
}

/**
 * Utility function to create a chevron icon
 * @param {number} bearing - Bearing in degrees
 * @returns {mapboxgl.Marker} Chevron icon marker
 */
export function createChevronIcon(bearing) {
    const chevronSize = 25; // Variable for chevron size, width, and height
    const chevronCharacter = '▲'; // Character for the chevron icon
    const chevronColor = 'white'; // Color for the chevron icon
    const xOffset = 0; // Reset offset
    const yOffset = 0; // Reset offset
    const rotationOffset = 0; // Rotation offset in degrees
    return new mapboxgl.Marker({
        color: 'blue',
        draggable: false
    }).setLngLat([0, 0]); // Placeholder coordinates
}
