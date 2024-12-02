// Utility function to create a chevron icon
export function createChevronIcon(bearing) {
    const chevronSize = 20; // Variable for chevron size
    const offset = 4; // Offset in pixels
    const radians = (bearing + 90) * (Math.PI / 180); // Convert bearing to radians
    const xOffset = 0; // Reset offset
    const yOffset = 0; // Reset offset
    return L.divIcon({
        html: `<div style="
            transform: rotate(${bearing + 90}deg) translate(${xOffset}px, ${yOffset}px);
            font-size: ${chevronSize}px;
            line-height: ${chevronSize}px;
            color: white;
            font-weight: bold;
            width: 25px;
            height: 25px;
            display: flex;
            align-items: center;
            justify-content: center;
            transform-origin: center center;
            font-family: Arial, sans-serif;
        ">↑</div>`,
        className: 'chevron-icon',
        iconSize: [25, 25],
        iconAnchor: [12.5, 12.5]
    });
}
