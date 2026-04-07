import type { Waypoint, PointOfInterest } from "@droneroute/shared";

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate the ideal gimbal pitch angle for a waypoint pointing at a POI.
 * Uses trigonometry: pitch = -atan2(heightDiff, horizontalDist)
 * Returns degrees where 0 = horizon, -90 = straight down, plus the 3D slant distance.
 */
export function calculateIdealGimbalPitch(wp: Waypoint, poi: PointOfInterest): { pitch: number; distance: number } {
  const horizontalDist = haversineDistance(wp.latitude, wp.longitude, poi.latitude, poi.longitude);
  const heightDiff = wp.height - poi.height; // positive = drone is above POI
  if (horizontalDist < 0.01) return { pitch: -90, distance: 0 }; // directly above → straight down
  const angleRad = Math.atan2(heightDiff, horizontalDist);
  const pitch = Math.round(-angleRad * (180 / Math.PI));
  const distance = Math.sqrt(horizontalDist ** 2 + heightDiff ** 2);
  return { pitch, distance };
}
