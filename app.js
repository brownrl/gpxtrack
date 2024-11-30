import mapConfig from './js/map-config.js';
import locationTracker from './js/location-tracker.js';
import trackManager from './js/track-manager.js';
import uiControls from './js/ui-controls.js';

// Initialize the map
const map = mapConfig.initMap();

// Initialize location tracking
locationTracker.initLocationTracking(map);

// Custom icons for start and end
const startIcon = L.divIcon({
    html: '🟢',  // Green circle for start
    className: 'custom-icon start-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const endIcon = L.divIcon({
    html: '🔴',  // Red circle for end
    className: 'custom-icon end-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

// Initialize track handling
trackManager.initTrackHandling(map, startIcon, endIcon);

// Initialize UI controls with map
uiControls.initUIControls(map);

// Ensure map is passed correctly to clearTrack
uiControls.clearTrack = () => trackManager.clearTrack(map);