/**
 * app.js - Application Mediator
 * 
 * This is the main entry point that acts as a mediator between all components.
 * Components communicate through the app rather than directly with each other.
 * 
 * Components:
 * - Map → map.js
 * - UI controls → ui-controls.js
 * - Track handling → track-manager.js
 * - Location tracking → location-tracker.js
 * - Progress tracking → progress-tracker.js
 * - Geographic utilities → geo-utils.js
 */

import map from './js/map.js';
import locationTracker from './js/location-tracker.js';
import trackManager from './js/track-manager.js';
import uiControls from './js/ui-controls.js';
import progressTracker from './js/progress-tracker.js';
import geoUtils from './js/geo-utils.js';

class App {
    constructor() {
        // Component name mapping (camelCase to component object)
        this.components = {
            map,
            locationTracker,
            trackManager,
            uiControls,
            progressTracker,
            geoUtils
        };

        // Create a proxy to handle dynamic component access
        return new Proxy(this, {
            get(target, prop) {
                // If the property exists on the class, return it
                if (prop in target) {
                    return target[prop];
                }

                // If it's a component access, return a function that gets the component
                if (prop in target.components) {
                    return () => target.components[prop];
                }

                return undefined;
            }
        });
    }

    /**
     * Initialize the application and all its components
     */
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            // Initialize components in order
            this.initializeComponentsInOrder();
        });
    }

    /**
     * Initialize components in the correct order to handle dependencies
     */
    initializeComponentsInOrder() {
        // 1. Initialize map and wait for style to load
        const mapComponent = this.map();
        if (!mapComponent) {
            console.error('Map component not found');
            return;
        }

        mapComponent.init(this);
        const mapInstance = mapComponent.getInstance();
        if (!mapInstance) {
            console.error('Map instance not initialized');
            return;
        }
        
        // Wait for map style to load before initializing other components
        mapInstance.on('style.load', () => {
            try {
                // 2. Initialize core utilities
                const geoUtils = this.geoUtils();
                if (geoUtils) geoUtils.init(this);

                // 3. Initialize track manager (needed by other components)
                const trackManager = this.trackManager();
                if (trackManager) trackManager.init(this);

                // 4. Initialize UI controls
                const uiControls = this.uiControls();
                if (uiControls) uiControls.init(this);

                // 5. Initialize progress tracker
                const progressTracker = this.progressTracker();
                if (progressTracker) progressTracker.init(this);

                // 6. Initialize location tracker last (as it depends on other components)
                const locationTracker = this.locationTracker();
                if (locationTracker) locationTracker.init(this);
            } catch (error) {
                console.error('Error initializing components:', error);
            }
        });
    }

    /**
     * Get a component by name (legacy method)
     * @deprecated Use direct component access methods instead (e.g., app.map())
     * @param {string} name - Name of the component
     * @returns {Object} The component instance
     */
    getComponent(name) {
        console.warn('getComponent is deprecated. Use direct component access methods instead.');
        return this.components[name];
    }
}

// Create and initialize the application
const app = new App();
app.init();

// Expose app to browser console for debugging
window.app = app;