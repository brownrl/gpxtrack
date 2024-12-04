// Removed centralized Mapbox access token export

import mapConfig from './js/map-config.js';
import locationTracker from './js/location-tracker.js';
import trackManager from './js/track-manager.js';
import uiControls from './js/ui-controls.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the map
    const map = mapConfig.initMap();
    if (!map || typeof map.addLayer !== 'function') {
        return;
    }

    // Initialize location tracking
    locationTracker.unpause(map);

    // Initialize track handling
    trackManager.initTrackHandling(map);

    // Initialize UI controls with map
    uiControls.initUIControls(map);

    // Ensure map is passed correctly to clearTrack
    uiControls.clearTrack = () => trackManager.clearTrack(map);
});