import geoUtils from './geo-utils.js';

/**
 * Represents a geographical point with optional tracking data
 */
class GeoPoint {
    /**
     * Create a new geographical point
     * @param {number} lng - Longitude
     * @param {number} lat - Latitude
     * @param {Object} options - Optional properties for the point
     */
    constructor(lng, lat, options = {}) {
        this.lng = lng;
        this.lat = lat;
        this.timestamp = options.timestamp || Date.now();
        this.distanceFromStart = options.distanceFromStart || 0;
        this.remainingDistance = options.remainingDistance || 0;
        this.heading = options.heading || null;
        this.accuracy = options.accuracy || null;
        this.altitude = options.altitude || null;
        this.speed = options.speed || null;
    }

    /**
     * Create a GeoPoint from a GeolocationPosition
     * @param {GeolocationPosition} position - Browser's geolocation position
     * @returns {GeoPoint} New GeoPoint instance
     */
    static fromPosition(position) {
        return new GeoPoint(
            position.coords.longitude,
            position.coords.latitude,
            {
                timestamp: position.timestamp,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                speed: position.coords.speed
            }
        );
    }

    /**
     * Create a GeoPoint from a coordinate array [lng, lat]
     * @param {Array} coord - Coordinate array [longitude, latitude]
     * @returns {GeoPoint} New GeoPoint instance
     */
    static fromArray(coord) {
        return new GeoPoint(coord[0], coord[1]);
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

    /**
     * Get the point as a GeoJSON Point feature
     * @returns {Object} GeoJSON Point feature
     */
    toGeoJSON() {
        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: this.toArray()
            },
            properties: {
                timestamp: this.timestamp,
                heading: this.heading,
                accuracy: this.accuracy,
                altitude: this.altitude,
                speed: this.speed,
                distanceFromStart: this.distanceFromStart,
                remainingDistance: this.remainingDistance
            }
        };
    }

    /**
     * Calculate distance to another point in meters
     * @param {GeoPoint} point - Point to calculate distance to
     * @returns {number} Distance in meters
     */
    distanceTo(point) {
        return geoUtils.calculateDistance(this, point);
    }
}

export default GeoPoint;
