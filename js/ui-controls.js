// UI controls and event listeners
const uiControls = {
    initUIControls: function() {
        // Add event listeners for buttons
        document.querySelector('.file-picker-button').addEventListener('click', function() {
            document.getElementById('gpx-file').click();
        });

        document.querySelector('.clear-button').addEventListener('click', this.clearTrack);
    },

    clearTrack: function() {
        // This function will be overridden by trackManager's clearTrack
    }
};

export default uiControls;