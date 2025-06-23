/**
 * track-manager.js
 * Business logic for track operations and file handling
 */

import config from '../core/config.js';

class TrackManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.setupEventListeners();
        this.setupFileInput();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.eventBus.on('track:load-file-requested', this.handleFileLoadRequest, this);
        this.eventBus.on('track:reload-requested', this.handleReloadRequest, this);
        this.eventBus.on('track:clear-requested', this.handleClearRequest, this);
    }

    /**
     * Setup file input handler
     */
    setupFileInput() {
        const fileInput = document.querySelector(config.ui.selectors.gpxFileInput);
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileSelection.bind(this));
        }
    }

    /**
     * Handle file selection from input
     * @param {Event} event - File input change event
     */
    async handleFileSelection(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const gpxContent = await this.readGPXFile(file);
            this.eventBus.emit('track:load-requested', {
                gpxContent,
                source: 'file',
                filename: file.name
            });
        } catch (error) {
            this.eventBus.emit('track:load-error', {
                error,
                message: 'Failed to read GPX file'
            });
        }

        // Clear file input
        event.target.value = '';
    }

    /**
     * Handle file load request
     */
    handleFileLoadRequest() {
        const fileInput = document.querySelector(config.ui.selectors.gpxFileInput);
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * Handle reload request
     */
    handleReloadRequest() {
        const lastGpxContent = localStorage.getItem(config.storage.keys.lastGpxContent);
        if (lastGpxContent) {
            this.eventBus.emit('track:load-requested', {
                gpxContent: lastGpxContent,
                source: 'storage'
            });
        }
    }

    /**
     * Handle clear request
     */
    handleClearRequest() {
        // Clear file input
        const fileInput = document.querySelector(config.ui.selectors.gpxFileInput);
        if (fileInput) {
            fileInput.value = '';
        }

        // Emit clear request to data store
        this.eventBus.emit('track:clear-requested');
    }

    /**
     * Read GPX file content
     * @param {File} file - GPX file to read
     * @returns {Promise<string>} File content
     */
    readGPXFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
}

export default TrackManager;
