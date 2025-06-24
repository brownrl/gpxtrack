/**
 * external-services.js
 * Handles external service integrations like Google Maps
 */

import config from '../core/config.js';

class ExternalServices {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.locationDataStore = null;
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventBus.on('ui:map-search-requested', this.handleMapSearchRequest, this);
        this.eventBus.on('location:updated', this.handleLocationUpdate, this);
    }

    /**
     * Handle location update (store reference for map searches)
     * @param {Object} data - Location data
     */
    handleLocationUpdate(data) {
        if (data && data.location) {
            this.currentLocation = data.location;
        } else {
            console.warn('Received invalid location data');
        }
    }

    /**
     * Handle map search request
     * @param {Object} data - Search request data
     */
    handleMapSearchRequest(data) {
        const { searchType } = data;

        if (!this.currentLocation) {
            console.warn('No current location available for map search');
            return;
        }

        const mapsUrl = this.buildGoogleMapsUrl(searchType, this.currentLocation);
        window.open(mapsUrl, '_blank');

        this.eventBus.emit('external-service:map-opened', {
            searchType,
            location: this.currentLocation,
            url: mapsUrl
        });
    }

    /**
     * Build Google Maps URL for search
     * @param {string} searchType - Type of search
     * @param {GeoPoint} location - Current location
     * @returns {string} Google Maps URL
     */
    buildGoogleMapsUrl(searchType, location) {
        const { baseUrl, searchTypes } = config.services.googleMaps;
        const lat = location.lat;
        const lng = location.lng;

        if (searchType === 'location') {
            // Just show current location
            return `${baseUrl}?q=${lat},${lng}`;
        }

        // Search for specific type
        const searchTerm = searchTypes[searchType] || searchType;
        return `${baseUrl}/search/${searchTerm}/@${lat},${lng},13z`;
    }
}

export default ExternalServices;
