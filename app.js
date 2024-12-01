import mapConfig from './js/map-config.js';
import locationTracker from './js/location-tracker.js';
import trackManager from './js/track-manager.js';
import uiControls from './js/ui-controls.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the map
    const map = mapConfig.initMap();
    if (!map || typeof map.addLayer !== 'function') {
        console.error('Invalid map instance upon initialization');
        return;
    }

    // Initialize location tracking
    locationTracker.initLocationTracking(map);

    // Initialize track handling
    trackManager.initTrackHandling(map);

    // Initialize UI controls with map
    uiControls.initUIControls(map);

    // Ensure map is passed correctly to clearTrack
    uiControls.clearTrack = () => trackManager.clearTrack(map);
});