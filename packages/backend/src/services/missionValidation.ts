/**
 * Server-side validation for mission payloads.
 *
 * Client-side checks are UX only — every payload that gets persisted or fed to
 * the KMZ generator is validated here too. The goal is to reject malformed,
 * oversized or out-of-range data before it reaches the database or downstream
 * processing (defends against DoS via huge arrays, NaN/Infinity coordinates and
 * type-confusion). Each validator returns an error string, or `null` when valid.
 */

const MAX_NAME_LEN = 200;
const MAX_WAYPOINTS = 5000;
const MAX_POIS = 2000;
const MAX_OBSTACLES = 1000;
const MAX_VERTICES_PER_OBSTACLE = 5000;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isLatitude(v: unknown): boolean {
  return isFiniteNumber(v) && v >= -90 && v <= 90;
}

function isLongitude(v: unknown): boolean {
  return isFiniteNumber(v) && v >= -180 && v <= 180;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidName(v: unknown): boolean {
  return (
    typeof v === "string" && v.trim().length >= 1 && v.length <= MAX_NAME_LEN
  );
}

function isOptionalName(v: unknown): boolean {
  return v === undefined || (typeof v === "string" && v.length <= MAX_NAME_LEN);
}

function validateWaypoints(value: unknown): string | null {
  if (!Array.isArray(value)) return "waypoints must be an array";
  if (value.length > MAX_WAYPOINTS) return "too many waypoints";
  for (const wp of value) {
    if (!isPlainObject(wp)) return "invalid waypoint";
    if (!isLatitude(wp.latitude) || !isLongitude(wp.longitude)) {
      return "waypoint coordinates out of range";
    }
    if (!isFiniteNumber(wp.height)) return "invalid waypoint height";
    if (!isOptionalName(wp.name)) return "invalid waypoint name";
  }
  return null;
}

function validatePois(value: unknown): string | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return "pois must be an array";
  if (value.length > MAX_POIS) return "too many points of interest";
  for (const poi of value) {
    if (!isPlainObject(poi)) return "invalid point of interest";
    if (!isLatitude(poi.latitude) || !isLongitude(poi.longitude)) {
      return "POI coordinates out of range";
    }
    if (!isFiniteNumber(poi.height)) return "invalid POI height";
    if (!isOptionalName(poi.name)) return "invalid POI name";
  }
  return null;
}

function validateObstacles(value: unknown): string | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return "obstacles must be an array";
  if (value.length > MAX_OBSTACLES) return "too many obstacles";
  for (const obstacle of value) {
    if (!isPlainObject(obstacle)) return "invalid obstacle";
    if (!Array.isArray(obstacle.vertices)) return "invalid obstacle vertices";
    if (obstacle.vertices.length > MAX_VERTICES_PER_OBSTACLE) {
      return "too many obstacle vertices";
    }
    for (const vertex of obstacle.vertices) {
      if (
        !Array.isArray(vertex) ||
        vertex.length !== 2 ||
        !isLatitude(vertex[0]) ||
        !isLongitude(vertex[1])
      ) {
        return "obstacle vertex out of range";
      }
    }
    if (!isOptionalName(obstacle.name)) return "invalid obstacle name";
  }
  return null;
}

export interface MissionPayload {
  name?: unknown;
  config?: unknown;
  waypoints?: unknown;
  pois?: unknown;
  obstacles?: unknown;
}

/** Validate a full mission-create payload. Returns an error message or null. */
export function validateMissionCreate(body: MissionPayload): string | null {
  if (!isValidName(body.name)) return "invalid mission name";
  if (!isPlainObject(body.config)) return "invalid mission config";
  return (
    validateWaypoints(body.waypoints) ??
    validatePois(body.pois) ??
    validateObstacles(body.obstacles)
  );
}

/**
 * Validate a partial mission-update payload — only the fields that are present
 * are checked.
 */
export function validateMissionUpdate(body: MissionPayload): string | null {
  if (body.name !== undefined && !isValidName(body.name)) {
    return "invalid mission name";
  }
  if (body.config !== undefined && !isPlainObject(body.config)) {
    return "invalid mission config";
  }
  if (body.waypoints !== undefined) {
    const error = validateWaypoints(body.waypoints);
    if (error) return error;
  }
  return validatePois(body.pois) ?? validateObstacles(body.obstacles);
}

/**
 * Validate the geometry of a parsed/submitted mission used for KMZ generation
 * and import — config shape is left to the caller, this focuses on the arrays.
 */
export function validateMissionGeometry(body: MissionPayload): string | null {
  return (
    validateWaypoints(body.waypoints) ??
    validatePois(body.pois) ??
    validateObstacles(body.obstacles)
  );
}
