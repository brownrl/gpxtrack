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

                // Convert camelCase to component name (e.g., uiControls -> ui-controls)
                const componentName = prop.replace(/([A-Z])/g, (match) => match.toLowerCase());

                // If it's a component access, return a function that gets the component
                if (componentName in target.components) {
                    return () => target.components[componentName];
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
            // Initialize all components
            this.initComponents();
        });
    }

    /**
     * Initialize all components with references to the app
     */
    initComponents() {
        // Initialize each component with a reference to the app
        Object.values(this.components).forEach(component => {
            if (component.init) {
                component.init(this);
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