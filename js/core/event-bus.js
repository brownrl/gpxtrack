/**
 * event-bus.js
 * Central event system for decoupled component communication
 */

class EventBus {
    constructor() {
        this.events = {};
        this.debugMode = false;
    }

    /**
     * Enable or disable debug logging
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @param {Object} context - Optional context for the callback
     */
    on(event, callback, context = null) {
        if (!this.events[event]) {
            this.events[event] = [];
        }

        this.events[event].push({ callback, context });

        if (this.debugMode) {
            console.log(`EventBus: Subscribed to '${event}'`);
        }
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        if (!this.events[event]) return;

        this.events[event] = this.events[event].filter(
            listener => listener.callback !== callback
        );

        if (this.debugMode) {
            console.log(`EventBus: Unsubscribed from '${event}'`);
        }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} event - Event name
     * @param {*} data - Data to pass to subscribers
     */
    emit(event, data = null) {
        if (this.debugMode) {
            console.log(`EventBus: Emitting '${event}'`, data);
        }

        if (!this.events[event]) return;

        this.events[event].forEach(listener => {
            try {
                if (listener.context) {
                    listener.callback.call(listener.context, data);
                } else {
                    listener.callback(data);
                }
            } catch (error) {
                console.error(`EventBus: Error in event '${event}' listener:`, error);
            }
        });
    }

    /**
     * Subscribe to an event that will only fire once
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @param {Object} context - Optional context for the callback
     */
    once(event, callback, context = null) {
        const onceCallback = (data) => {
            callback.call(context, data);
            this.off(event, onceCallback);
        };

        this.on(event, onceCallback);
    }

    /**
     * Get all registered events (for debugging)
     * @returns {Array} Array of event names
     */
    getEvents() {
        return Object.keys(this.events);
    }

    /**
     * Clear all event listeners
     */
    clear() {
        this.events = {};
        if (this.debugMode) {
            console.log('EventBus: Cleared all events');
        }
    }
}

export default EventBus;
