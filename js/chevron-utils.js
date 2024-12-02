// Utility function to create a chevron icon
export function createChevronIcon(bearing) {
    return L.divIcon({
        html: `<div style="
            transform: rotate(${bearing}deg);
            font-size: 24px;
            line-height: 24px;
            color: white;
            font-weight: bold;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            transform-origin: center center;
            font-family: Arial, sans-serif;
        ">›</div>`,
        className: 'chevron-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}
