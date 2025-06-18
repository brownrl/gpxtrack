/**
 * gpx-manager.js
 * Manages storage and retrieval of GPX tracks using localStorage
 */
const gpxManager = {
    // Constants
    STORAGE_KEY: 'gpx_tracks',
    MAX_TRACKS: 10,

    /**
     * Initialize the GPX Manager
     * @param {Object} app - Application mediator object
     */
    init(app) {
        this.app = app;
        this.trackManager = app.trackManager();
        // Ensure tracks structure exists in localStorage
        if (!this.getAllTracks()) {
            this.saveTracks([]);
        }
    },

    trackManager: null,
    /**
     * Generate a UUID v4 
     * @returns {String} A UUID string
     */
    generateUUID() {
        // Use browser's crypto API if available for better randomness
        if (window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }

        // Fallback implementation for older browsers
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Load the default GPX track from thewalk.gpx
     * @returns {Promise} - Resolves when default track is loaded
     */
    loadDefaultTrack() {
        return fetch('thewalk.gpx')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch default track');
                }
                return response.text();
            })
            .then(gpxData => {
                const defaultTrack = {
                    name: 'The Walk',
                    data: gpxData,
                    timestamp: Date.now(),
                    id: this.generateUUID()
                };

                const tracks = [];
                tracks.push(defaultTrack);
                this.saveTracks(tracks);
                return tracks;
            })
            .catch(error => {
                console.error('Error loading default track:', error);
                return [];
            });
    },

    /**
     * Get all stored tracks from localStorage
     * @returns {Array} Array of track objects
     */
    getAllTracks() {
        const tracksJson = localStorage.getItem(this.STORAGE_KEY);
        let tracks = tracksJson ? JSON.parse(tracksJson) : null;

        if (tracks && tracks.length === 0) {
            // If tracks list is empty, load the default track synchronously
            // Note: This will only populate localStorage on the next retrieval
            this.loadDefaultTrack().then(defaultTracks => {
                // No need to do anything here, as tracks will be saved in loadDefaultTrack
            });
        }

        return tracks;
    },

    /**
     * Save tracks to localStorage
     * @param {Array} tracks - Array of track objects to save
     */
    saveTracks(tracks) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tracks));
    },

    /**
     * Add a new GPX track to storage
     * @param {Object} track - Track object with name, data, and timestamp
     * @returns {Boolean} - True if successful, false otherwise
     */
    addTrack(track) {
        if (!track || !track.name || !track.data) {
            console.error('Invalid track data');
            return false;
        }

        try {
            // Ensure track has a timestamp and unique ID
            if (!track.timestamp) {
                track.timestamp = Date.now();
            }

            // Always generate a new UUID for the track
            track.id = this.generateUUID();

            // Get current tracks
            let tracks = this.getAllTracks() || [];

            // Add new track to the beginning (newest first)
            tracks.unshift(track);

            // If we exceed the maximum, remove the oldest track
            if (tracks.length > this.MAX_TRACKS) {
                tracks = tracks.slice(0, this.MAX_TRACKS);
            }

            // Save updated tracks list
            this.saveTracks(tracks);
            return true;
        } catch (error) {
            console.error('Error adding track:', error);
            return false;
        }
    },

    /**
     * Remove a track by its ID or index
     * @param {String|Number} identifier - Track ID or index to remove
     * @returns {Boolean} - True if successful, false otherwise
     */
    removeTrack(identifier) {
        try {
            const tracks = this.getAllTracks();
            if (!tracks) return false;

            let updatedTracks;
            if (typeof identifier === 'number') {
                // Remove by index
                if (identifier < 0 || identifier >= tracks.length) return false;
                updatedTracks = [...tracks.slice(0, identifier), ...tracks.slice(identifier + 1)];
            } else {
                // Remove by ID/timestamp
                updatedTracks = tracks.filter(track =>
                    (track.id !== identifier));
            }

            this.saveTracks(updatedTracks);
            return tracks.length !== updatedTracks.length; // True if a track was removed
        } catch (error) {
            console.error('Error removing track:', error);
            return false;
        }
    },

    /**
     * Get a specific track by index or ID
     * @param {String|Number} identifier - Track index or ID
     * @returns {Object|null} - Track object or null if not found
     */
    getTrack(identifier) {
        const tracks = this.getAllTracks();
        if (!tracks || !Array.isArray(tracks) || tracks.length === 0) return null;

        if (typeof identifier === 'number') {
            // Get by index
            return (identifier >= 0 && identifier < tracks.length) ? tracks[identifier] : null;
        } else {
            // Get by ID only (not timestamp, which could cause conflicts)
            return tracks.find(track => track.id === identifier) || null;
        }
    },

    /**
     * Clear all stored tracks
     * @returns {Boolean} - True if successful
     */
    clearAllTracks() {
        try {
            this.saveTracks([]);
            return true;
        } catch (error) {
            console.error('Error clearing tracks:', error);
            return false;
        }
    },

    /**
     * Import a GPX file and add it to storage
     * @param {File} file - GPX file object
     * @returns {Promise} - Resolves with success boolean
     */
    importGpxFile(file) {
        return new Promise((resolve, reject) => {
            if (!file || file.type !== 'application/gpx+xml' && !file.name.endsWith('.gpx')) {
                reject(new Error('Invalid file format. Please select a GPX file.'));
                return;
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const trackData = {
                        name: file.name.replace(/\.gpx$/i, ''),
                        data: e.target.result,
                        timestamp: Date.now()
                    };

                    const success = this.addTrack(trackData);
                    resolve(success);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Error reading the file'));
            };

            reader.readAsText(file);
        });
    },

    loadTrack(trackId) {

        const track = this.getTrack(trackId);
        if (!track || !track.data) {
            console.error('No valid track data found');
            return false;
        }

        // Use the track manager to load the track data onto the map

        this.trackManager.processGPXTrack(track.data);

    }
};

export default gpxManager;