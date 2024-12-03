export function calculateBearing(start, end, rotation = 0) {
    const startLat = start.lat * Math.PI / 180;
    const startLng = start.lng * Math.PI / 180;
    const endLat = end.lat * Math.PI / 180;
    const endLng = end.lng * Math.PI / 180;

    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);

    // Calculate the true compass bearing and apply rotation
    return ((Math.atan2(y, x) * 180 / Math.PI + 360 + rotation) % 360);
}

// Utility function to create a chevron icon
export function createChevronIcon(bearing) {
    const chevronSize = 25; // Variable for chevron size, width, and height
    const chevronCharacter = '▲'; // Character for the chevron icon
    const chevronColor = 'white'; // Color for the chevron icon
    const xOffset = 0; // Reset offset
    const yOffset = 0; // Reset offset
    const rotationOffset = 0; // Rotation offset in degrees
    return L.divIcon({
        html: `<div style="
            transform: rotate(${bearing + rotationOffset}deg) translate(${xOffset}px, ${yOffset}px);
            font-size: ${chevronSize}px;
            line-height: ${chevronSize}px;
            color: ${chevronColor};
            font-weight: bold;
            width: ${chevronSize}px;
            height: ${chevronSize}px;
            display: flex;
            align-items: center;
            justify-content: center;
            transform-origin: center center;
            font-family: Arial, sans-serif;
        ">${chevronCharacter}</div>`,
        iconSize: [chevronSize, chevronSize],
        className: '',
    });
}
