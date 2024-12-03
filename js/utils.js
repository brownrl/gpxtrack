// Calculate bearing between two points
export function calculateBearing(point1, point2) {
    // Convert array format [lng, lat] to object format {lat, lng} if needed
    const p1 = Array.isArray(point1)
        ? { lat: point1[1], lng: point1[0] }
        : point1;
    const p2 = Array.isArray(point2)
        ? { lat: point2[1], lng: point2[0] }
        : point2;

    const φ1 = p1.lat * Math.PI / 180;
    const φ2 = p2.lat * Math.PI / 180;
    const λ1 = p1.lng * Math.PI / 180;
    const λ2 = p2.lng * Math.PI / 180;

    const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360
}

// Distance calculation between two points
export function calculateDistance(point1, point2) {
    // Convert array format [lng, lat] to object format {lat, lng} if needed
    const p1 = Array.isArray(point1) 
        ? { lat: point1[1], lng: point1[0] }
        : point1;
    const p2 = Array.isArray(point2)
        ? { lat: point2[1], lng: point2[0] }
        : point2;

    const R = 6371e3; // Earth's radius in meters
    const φ1 = p1.lat * Math.PI / 180;
    const φ2 = p2.lat * Math.PI / 180;
    const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
    const Δλ = (p2.lng - p1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ/2) * Math.sin(Δλ/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
}

// Utility function to create a chevron icon
export function createChevronIcon(bearing) {
    const chevronSize = 25; // Variable for chevron size, width, and height
    const chevronCharacter = '▲'; // Character for the chevron icon
    const chevronColor = 'white'; // Color for the chevron icon
    const xOffset = 0; // Reset offset
    const yOffset = 0; // Reset offset
    const rotationOffset = 0; // Rotation offset in degrees
    return new mapboxgl.Marker({
        color: 'blue',
        draggable: false
    }).setLngLat([0, 0]); // Placeholder coordinates
}
