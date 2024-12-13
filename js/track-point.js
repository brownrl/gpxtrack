/**
 * Represents a point in the track with its location and distance information
 */
class TrackPoint {
    /**
     * Create a new track point
     * @param {number} lng - Longitude
     * @param {number} lat - Latitude
     */
    constructor(lng, lat) {
        this.lng = lng;
        this.lat = lat;
        this.distanceFromStart = 0;
        this.remainingDistance = 0;
    }

    /**
     * Get the point in lat/lng object format
     * @returns {Object} Point with lat and lng properties
     */
    toLatLng() {
        return { lat: this.lat, lng: this.lng };
    }

    /**
     * Get the point in [lng, lat] array format (for Mapbox)
     * @returns {Array} Point as [lng, lat] array
     */
    toArray() {
        return [this.lng, this.lat];
    }
}

export default TrackPoint;
