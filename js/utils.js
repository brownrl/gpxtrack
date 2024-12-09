/**
 * utils.js
 * Utility functions for calculations and conversions.
 * 
 * Key features:
 * - Geographic calculations (distance, bearing)
 * - Unit conversions
 * - Coordinate transformations
 */

/**
 * Calculates the bearing between two points
 * @param {Array} start - Starting point [lon, lat]
 * @param {Array} end - Ending point [lon, lat]
 * @returns {number} Bearing in degrees
 */
export function calculateBearing([lon1, lat1], [lon2, lat2]) {
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
 * @param {Array} start - Starting point [lon, lat]
 * @param {Array} end - Ending point [lon, lat]
 * @returns {number} Distance in meters
 */
export function calculateDistance([lon1, lat1], [lon2, lat2]) {
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
