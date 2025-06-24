/**
 * app.js - New Event-Driven Application Coordinator
 * 
 * This is the main entry point that creates and coordinates all components
 * through an event-driven architecture. Components communicate only through
 * events, not direct method calls.
 */

// Core
import EventBus from './event-bus.js';
import config from './config.js';

// Data Layer
import TrackDataStore from '../data/track-data-store.js';
import LocationDataStore from '../data/location-data-store.js';

// UI Layer
import UIStateManager from '../ui/ui-state-manager.js';
import UIControls from '../ui/ui-controls.js';
import ProgressDisplay from '../ui/progress-display.js';

// Map Layer
import MapRenderer from '../map/map-renderer.js';
import TrackRenderer from '../map/track-renderer.js';
import LocationRenderer from '../map/location-renderer.js';

// Services Layer
import TrackManager from '../services/track-manager.js';
import LocationTracker from '../services/location-tracker.js';
import ProgressTracker from '../services/progress-tracker.js';
import ExternalServices from '../services/external-services.js';

class App {
    constructor() {
        // Create central event bus
        this.eventBus = new EventBus();

        // Enable debug mode if configured
        this.eventBus.setDebugMode(config.debug.eventBus);

        // Component instances
        this.components = {};

        // Initialization promise
        this.initPromise = null;

        // Wake Lock
        this.wakeLock = null;
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this.initializeApp();
        return this.initPromise;
    }

    /**
     * Initialize all application components
     */
    async initializeApp() {
        try {
            console.log('Initializing GPX Track Navigator...');

            // Wait for DOM to be ready
            await this.waitForDOM();

            // Initialize components in dependency order
            await this.initializeComponents();

            // Setup cross-component event connections
            this.setupEventConnections();

            // Start the application
            this.startApplication();

            console.log('GPX Track Navigator initialized successfully');

        } catch (error) {
            console.error('Failed to initialize application:', error);
            throw error;
        }
    }

    /**
     * Wait for DOM to be ready
     */
    waitForDOM() {
        return new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    /**
     * Initialize all components
     */
    async initializeComponents() {
        console.log('Initializing components...');

        // Data Layer - foundational components
        this.components.trackDataStore = new TrackDataStore(this.eventBus);
        this.components.locationDataStore = new LocationDataStore(this.eventBus);

        // UI Layer - user interface components
        this.components.uiStateManager = new UIStateManager(this.eventBus);
        this.components.uiControls = new UIControls(this.eventBus);
        this.components.progressDisplay = new ProgressDisplay(this.eventBus);

        // Map Layer - map rendering components
        this.components.mapRenderer = new MapRenderer(this.eventBus);
        this.components.trackRenderer = new TrackRenderer(this.eventBus);
        this.components.locationRenderer = new LocationRenderer(this.eventBus);

        // Services Layer - business logic components
        this.components.trackManager = new TrackManager(this.eventBus);
        this.components.locationTracker = new LocationTracker(this.eventBus);
        this.components.progressTracker = new ProgressTracker(this.eventBus);
        this.components.externalServices = new ExternalServices(this.eventBus);

        console.log('All components initialized');
    }

    /**
     * Setup cross-component event connections
     */
    setupEventConnections() {
        // Progress tracker needs access to track data
        this.eventBus.on('progress:track-data-requested', (data) => {
            const { location, requestId } = data;

            // Get track data and calculate progress
            this.components.progressTracker.calculateProgress(
                location,
                this.components.trackDataStore
            );
        });

        // Handle immediate progress calculation request
        this.eventBus.on('progress:calculate-immediate', () => {
            const currentLocation = this.components.locationDataStore.getCurrentLocation();
            if (currentLocation) {
                this.components.progressTracker.calculateProgress(
                    currentLocation,
                    this.components.trackDataStore
                );
            }
        });

        // Location data store should emit updates when data changes
        this.eventBus.on('location:update-requested', () => {
            const locationData = this.components.locationDataStore.getLocationData();
            if (locationData.currentLocation) {
                this.eventBus.emit('location:updated', locationData);
            }
        });

        // Map initialization chain
        this.eventBus.on('map:style-loaded', () => {
            // Start location tracking once map is ready
            this.eventBus.emit('location:start-tracking-requested');

            // Check for stored track and reload if available
            const storedTrack = localStorage.getItem(config.storage.keys.lastGpxContent);
            if (storedTrack) {
                // Emit event to show reload button
                this.eventBus.emit('track:cleared'); // Triggers UI update
            }
        });

        // Wake lock toggle
        this.eventBus.on('ui:wake-lock-toggle', async () => {
            if (!this.wakeLock) {
                try {
                    this.wakeLock = await navigator.wakeLock.request('screen');
                    this.components.uiControls.elements.wakeBtn.textContent = '🔒';
                    this.wakeLock.addEventListener('release', () => {
                        this.components.uiControls.elements.wakeBtn.textContent = '🔓';
                        this.wakeLock = null;
                    });
                } catch (err) {
                    console.error('Failed to acquire wake lock:', err);
                }
            } else {
                this.wakeLock.release();
                this.wakeLock = null;
                this.components.uiControls.elements.wakeBtn.textContent = '🔓';
            }
        });

        // Ensure wake lock is released when a track is cleared
        this.eventBus.on('track:cleared', () => {
            if (this.wakeLock) {
                this.wakeLock.release();
                this.wakeLock = null;
                this.components.uiControls.elements.wakeBtn.textContent = '🔓';
            }
        });
    }

    /**
     * Start the application
     */
    startApplication() {
        console.log('Starting application...');

        // Initialize map
        this.eventBus.emit('map:init-requested');

        // Log event bus status if debugging
        if (config.debug.eventBus) {
            console.log('Registered events:', this.eventBus.getEvents());
        }

        console.log('Application started');
    }

    /**
     * Get component instance by name (for debugging)
     * @param {string} name - Component name
     * @returns {Object} Component instance
     */
    getComponent(name) {
        return this.components[name];
    }

    /**
     * Get event bus (for debugging)
     * @returns {EventBus} Event bus instance
     */
    getEventBus() {
        return this.eventBus;
    }

    /**
     * Cleanup application
     */
    cleanup() {
        // Stop location tracking
        this.eventBus.emit('location:stop-tracking-requested');

        // Clear event bus
        this.eventBus.clear();

        console.log('Application cleaned up');
    }
}

// Create and initialize the application
const app = new App();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await app.init();
    } catch (error) {
        console.error('Application initialization failed:', error);
    }
});

// Expose app to browser console for debugging
window.app = app;

export default app;
