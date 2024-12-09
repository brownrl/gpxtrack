/**
 * app.js - CORE INITIALIZATION FILE
 * ⚠️ WARNING: This file is PINNED and should not be modified! ⚠️
 * 
 * This is the main entry point that handles core initialization of the application.
 * It should only contain the essential setup code for the major components.
 * 
 * Any new features or UI controls should be added to their respective modules:
 * - UI controls → ui-controls.js
 * - Track handling → track-manager.js
 * - Location tracking → location-tracker.js
 * - Map configuration → map-config.js
 * 
 * @lastModified 2024-12-09
 * @status PINNED
 */

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

    // Wait for map style to load before initializing components
    map.on('style.load', () => {
        // Initialize location tracking
        locationTracker.initLocationTracking(map);

        // Initialize UI controls
        uiControls.initUIControls(map);

        // Initialize track handling
        trackManager.initTrackHandling(map);
    });
});