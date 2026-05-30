/**
 * Geolocation & Math helpers for RideProfit
 */

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula. Returns distance in kilometers.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

/**
 * Format distance value nicely with 2 decimal places.
 */
export function formatDistance(km: number): string {
  if (km < 0.1) {
    return `${(km * 1000).toFixed(0)} m`;
  }
  return `${km.toFixed(2)} km`;
}

/**
 * Format duration nicely (e.g. 1h 4m 23s or 4m 12s)
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

/**
 * Simulates real GPS driving coordinate updates starting from a city center or current position.
 * This ensures the app is highly interactive even when testing indoors or inside the AI Studio iframe.
 */
export function getSimulatedNextCoordinate(
  prevLat: number,
  prevLng: number,
  stepIndex: number
): { lat: number; lng: number } {
  // Add a slight random noise but guided movement to mimic a vehicle moving along streets.
  // Standard street block length is roughly 0.0005 to 0.0015 coordinate degrees.
  const angle = (stepIndex * 45 * Math.PI) / 180; // Turn in a sweeping motion
  const speedFactor = 0.0006 + Math.random() * 0.0004; // Vary speed slightly
  
  const nextLat = prevLat + Math.sin(angle) * speedFactor;
  const nextLng = prevLng + Math.cos(angle) * speedFactor;
  
  return { lat: nextLat, lng: nextLng };
}
