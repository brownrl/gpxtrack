/**
 * track-renderer.js
 * Handles track visualization on the map - separate from core map functionality
 */

import config from '../core/config.js';

class TrackRenderer {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.mapInstance = null;
        this.isTrackVisible = false;
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventBus.on('map:style-loaded', this.handleMapStyleLoaded, this);
        this.eventBus.on('track:loaded', this.handleTrackLoaded, this);
        this.eventBus.on('track:cleared', this.handleTrackCleared, this);
    }

    /**
     * Handle map style loaded
     * @param {Object} data - Contains map instance
     */
    handleMapStyleLoaded(data) {
        this.mapInstance = data.mapInstance;
        this.setupTrackVisualization();
    }

    /**
     * Handle track loaded
     * @param {Object} data - Track data
     */
    handleTrackLoaded(data) {
        const { trackPoints } = data;
        this.renderTrack(trackPoints);
    }

    /**
     * Handle track cleared
     */
    handleTrackCleared() {
        this.clearTrack();
    }

    /**
     * Setup track visualization resources
     */
    setupTrackVisualization() {
        if (!this.mapInstance) return;

        // Create arrow image for direction indicators
        const arrowImage = this.createArrowImage();
        this.mapInstance.addImage('direction-arrow', arrowImage);
    }

    /**
     * Render track on the map
     * @param {Array} trackPoints - Array of GeoPoint objects
     */
    async renderTrack(trackPoints) {
        if (!this.mapInstance || !trackPoints || trackPoints.length === 0) return;

        // Convert track points to coordinates
        const coordinates = trackPoints.map(point => point.toArray());

        // Create track line
        const trackLine = {
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': coordinates
            }
        };

        // Add track line source and layer
        this.mapInstance.addSource('track', {
            'type': 'geojson',
            'data': trackLine
        });

        this.mapInstance.addLayer({
            'id': 'track',
            'type': 'line',
            'source': 'track',
            'slot': 'trackAndDirectionsSlot',
            'paint': {
                'line-color': config.track.style.lineColor,
                'line-width': config.track.style.lineWeight
            }
        });

        // Add direction indicators
        const directionPoints = await this.createDirectionPoints(coordinates);

        this.mapInstance.addSource('track-directions', {
            'type': 'geojson',
            'data': directionPoints
        });

        this.mapInstance.addLayer({
            'id': 'track-directions',
            'type': 'symbol',
            'source': 'track-directions',
            'slot': 'trackAndDirectionsSlot',
            'layout': {
                'icon-image': 'direction-arrow',
                'icon-rotate': ['get', 'bearing'],
                'icon-rotation-alignment': 'map',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
            }
        });

        this.isTrackVisible = true;

        // Optionally fit bounds to track (based on config)
        if (config.track.visualization.showOnLoad) {
            this.fitToTrack(coordinates);
        }

        this.eventBus.emit('track:rendered', {
            coordinates,
            trackLine,
            directionPoints
        });
    }

    /**
     * Clear track visualization
     */
    clearTrack() {
        if (!this.mapInstance) return;

        // Remove layers
        if (this.mapInstance.getLayer('track-directions')) {
            this.mapInstance.removeLayer('track-directions');
        }
        if (this.mapInstance.getLayer('track')) {
            this.mapInstance.removeLayer('track');
        }

        // Remove sources
        if (this.mapInstance.getSource('track-directions')) {
            this.mapInstance.removeSource('track-directions');
        }
        if (this.mapInstance.getSource('track')) {
            this.mapInstance.removeSource('track');
        }

        this.isTrackVisible = false;

        this.eventBus.emit('track:rendering-cleared');
    }

    /**
     * Fit map to track bounds
     * @param {Array} coordinates - Track coordinates
     */
    fitToTrack(coordinates) {
        if (!this.mapInstance || !coordinates || coordinates.length === 0) return;

        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach(coord => bounds.extend(coord));

        this.eventBus.emit('map:fit-bounds-requested', {
            bounds,
            options: {
                padding: config.track.visualization.fitBoundsPadding
            }
        });

        // Emit event to pause location tracking temporarily
        this.eventBus.emit('location:pause-requested');

        // Resume location tracking after showing full track
        setTimeout(() => {
            this.eventBus.emit('location:resume-requested');
        }, config.track.visualization.showDuration);
    }

    /**
     * Create direction points with bearings
     * @param {Array} coordinates - Array of track coordinates
     * @returns {Object} Direction points GeoJSON
     */
    async createDirectionPoints(coordinates) {
        const { frequency } = config.track.arrows;
        const features = [];

        // Import geoUtils
        const { default: geoUtils } = await import('../data/geo-utils.js');

        for (let i = 0; i < coordinates.length - 1; i += frequency) {
            const point1 = coordinates[i];
            const point2 = coordinates[i + 1];
            if (!point2) continue;

            const bearing = geoUtils.calculateBearing(point1, point2);

            features.push({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': point1
                },
                'properties': {
                    'bearing': bearing
                }
            });
        }

        return {
            'type': 'FeatureCollection',
            'features': features
        };
    }

    /**
     * Create arrow image for direction indicators
     * @returns {ImageData} Arrow image data
     */
    createArrowImage() {
        const { width, height, color } = config.track.arrows;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.font = `${height}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw the ^ character
        ctx.fillText('^', width / 2, height / 2);

        return ctx.getImageData(0, 0, width, height);
    }

    /**
     * Check if track is currently visible
     * @returns {boolean} Whether track is visible
     */
    isVisible() {
        return this.isTrackVisible;
    }
}

export default TrackRenderer;
