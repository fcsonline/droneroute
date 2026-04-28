import type { Waypoint, PointOfInterest, Obstacle } from "@droneroute/shared";

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
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
export function calculateIdealGimbalPitch(
  wp: Waypoint,
  poi: PointOfInterest,
): { pitch: number; distance: number } {
  const horizontalDist = haversineDistance(
    wp.latitude,
    wp.longitude,
    poi.latitude,
    poi.longitude,
  );
  const heightDiff = wp.height - poi.height; // positive = drone is above POI
  if (horizontalDist < 0.01) return { pitch: -90, distance: 0 }; // directly above → straight down
  const angleRad = Math.atan2(heightDiff, horizontalDist);
  const pitch = Math.round(-angleRad * (180 / Math.PI));
  const distance = Math.sqrt(horizontalDist ** 2 + heightDiff ** 2);
  return { pitch, distance };
}

// ── Obstacle geometry utilities ──────────────────────────

/**
 * Ray-casting point-in-polygon test.
 * Returns true if the point [lat, lng] is inside the polygon.
 */
export function pointInPolygon(
  point: [number, number],
  polygon: [number, number][],
): boolean {
  const [py, px] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [iy, ix] = polygon[i];
    const [jy, jx] = polygon[j];
    if (iy > py !== jy > py && px < ((jx - ix) * (py - iy)) / (jy - iy) + ix) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Test if two line segments (p1→p2) and (p3→p4) intersect.
 */
function segmentsIntersect(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  p4: [number, number],
): boolean {
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);

  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return true;
  }

  if (d1 === 0 && onSegment(p3, p4, p1)) return true;
  if (d2 === 0 && onSegment(p3, p4, p2)) return true;
  if (d3 === 0 && onSegment(p1, p2, p3)) return true;
  if (d4 === 0 && onSegment(p1, p2, p4)) return true;

  return false;
}

function direction(
  a: [number, number],
  b: [number, number],
  c: [number, number],
): number {
  return (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]);
}

function onSegment(
  a: [number, number],
  b: [number, number],
  c: [number, number],
): boolean {
  return (
    Math.min(a[0], b[0]) <= c[0] &&
    c[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= c[1] &&
    c[1] <= Math.max(a[1], b[1])
  );
}

/**
 * Test if a line segment (p1→p2) intersects any edge of a polygon.
 */
export function segmentIntersectsPolygon(
  p1: [number, number],
  p2: [number, number],
  polygon: [number, number][],
): boolean {
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (segmentsIntersect(p1, p2, polygon[j], polygon[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Obstacle warning describing a flight path conflict.
 */
export interface ObstacleWarning {
  obstacleId: string;
  obstacleName: string;
  waypointIndex: number;
  type: "crosses" | "inside";
}

/**
 * Check all waypoints and flight path segments against all obstacles.
 * Returns a list of warnings for any conflicts found.
 */
export function getObstacleWarnings(
  waypoints: { latitude: number; longitude: number; index: number }[],
  obstacles: Obstacle[],
): ObstacleWarning[] {
  if (obstacles.length === 0 || waypoints.length === 0) return [];

  const warnings: ObstacleWarning[] = [];

  for (const obstacle of obstacles) {
    if (obstacle.vertices.length < 3) continue;

    // Check waypoints inside polygon
    for (const wp of waypoints) {
      if (pointInPolygon([wp.latitude, wp.longitude], obstacle.vertices)) {
        warnings.push({
          obstacleId: obstacle.id,
          obstacleName: obstacle.name,
          waypointIndex: wp.index,
          type: "inside",
        });
      }
    }

    // Check segments crossing polygon
    for (let i = 0; i < waypoints.length - 1; i++) {
      const wp1 = waypoints[i];
      const wp2 = waypoints[i + 1];
      const p1: [number, number] = [wp1.latitude, wp1.longitude];
      const p2: [number, number] = [wp2.latitude, wp2.longitude];

      if (segmentIntersectsPolygon(p1, p2, obstacle.vertices)) {
        warnings.push({
          obstacleId: obstacle.id,
          obstacleName: obstacle.name,
          waypointIndex: wp1.index,
          type: "crosses",
        });
      }
    }
  }

  return warnings;
}

/**
 * Compute the approximate area of a polygon on the Earth's surface.
 * Uses the Shoelace formula on projected coordinates (equirectangular).
 * Returns area in square meters.
 */
export function polygonArea(vertices: [number, number][]): number {
  if (vertices.length < 3) return 0;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Use centroid latitude for equirectangular projection scale
  const avgLat = vertices.reduce((s, v) => s + v[0], 0) / vertices.length;
  const cosLat = Math.cos(toRad(avgLat));
  const R = 6371000; // Earth radius in meters

  // Convert to local meters using equirectangular projection
  const refLat = vertices[0][0];
  const refLng = vertices[0][1];
  const projected = vertices.map((v) => [
    (v[1] - refLng) * toRad(1) * R * cosLat, // x (east)
    (v[0] - refLat) * toRad(1) * R, // y (north)
  ]);

  // Shoelace formula
  let area = 0;
  for (let i = 0, j = projected.length - 1; i < projected.length; j = i++) {
    area += projected[j][0] * projected[i][1];
    area -= projected[i][0] * projected[j][1];
  }

  return Math.abs(area / 2);
}
