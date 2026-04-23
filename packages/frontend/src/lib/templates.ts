import type {
  Waypoint,
  PointOfInterest,
  WaypointAction,
} from "@droneroute/shared";
import { DEFAULT_WAYPOINT } from "@droneroute/shared";

// ── Helpers ──────────────────────────────────────────────

/** Move a lat/lng point by a distance (meters) and bearing (degrees, 0=N) */
function destinationPoint(
  lat: number,
  lng: number,
  distanceM: number,
  bearingDeg: number,
): [number, number] {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);
  const brng = toRad(bearingDeg);
  const d = distanceM / R;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );

  return [toDeg(lat2), toDeg(lng2)];
}

/** Bearing from point A to point B in degrees (0=N, 90=E) */
function bearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Haversine distance in meters */
function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Template Types ───────────────────────────────────────

export type TemplateType = "orbit" | "grid" | "facade" | "pencil";

export interface OrbitParams {
  center: [number, number]; // [lat, lng]
  radiusM: number;
  altitude: number;
  numPoints: number;
  clockwise: boolean;
  createPoi: boolean;
}

export interface GridParams {
  corner1: [number, number]; // [lat, lng]
  corner2: [number, number]; // [lat, lng]
  altitude: number;
  spacingM: number;
  addPhotos: boolean;
  rotationDeg: number; // rotation of the grid in degrees (0-360)
  reverse: boolean; // fly the grid in reverse order
}

export interface FacadeParams {
  point1: [number, number]; // [lat, lng] — one end of wall
  point2: [number, number]; // [lat, lng] — other end of wall
  distanceM: number; // distance from wall
  minAltitude: number;
  maxAltitude: number;
  numRows: number;
  numColumns: number;
  addPhotos: boolean;
}

export interface PencilParams {
  path: [number, number][]; // raw drawn points [lat, lng]
  numPoints: number; // target waypoint count
  altitude: number;
  speed: number;
  gimbalPitchAngle: number;
  reverse: boolean;
  poiId?: string; // optional POI to face during flight
}

export type TemplateParams =
  | OrbitParams
  | GridParams
  | FacadeParams
  | PencilParams;

export interface TemplateResult {
  waypoints: Omit<Waypoint, "index" | "name">[];
  pois: Omit<PointOfInterest, "id">[];
}

// ── Default Params ───────────────────────────────────────

export const DEFAULT_ORBIT_PARAMS: Omit<OrbitParams, "center" | "radiusM"> = {
  altitude: 30,
  numPoints: 12,
  clockwise: true,
  createPoi: true,
};

export const DEFAULT_GRID_PARAMS: Omit<GridParams, "corner1" | "corner2"> = {
  altitude: 80,
  spacingM: 30,
  addPhotos: true,
  rotationDeg: 0,
  reverse: false,
};

export const DEFAULT_FACADE_PARAMS: Omit<FacadeParams, "point1" | "point2"> = {
  distanceM: 20,
  minAltitude: 10,
  maxAltitude: 30,
  numRows: 4,
  numColumns: 8,
  addPhotos: true,
};

export const DEFAULT_PENCIL_PARAMS: Omit<PencilParams, "path"> = {
  numPoints: 10,
  altitude: 30,
  speed: 7,
  gimbalPitchAngle: -45,
  reverse: false,
};

// ── Generators ───────────────────────────────────────────

export function generateOrbit(params: OrbitParams): TemplateResult {
  const { center, radiusM, altitude, numPoints, clockwise, createPoi } = params;
  const [cLat, cLng] = center;

  const waypoints: TemplateResult["waypoints"] = [];
  const pois: TemplateResult["pois"] = [];

  // Optionally create a POI at the center
  const poiName = "Orbit center";

  if (createPoi) {
    pois.push({ name: poiName, latitude: cLat, longitude: cLng, height: 0 });
  }

  for (let i = 0; i < numPoints; i++) {
    const fraction = i / numPoints;
    // Start from North (0°), go clockwise or counter-clockwise
    const angleDeg = clockwise ? fraction * 360 : 360 - fraction * 360;
    const [lat, lng] = destinationPoint(cLat, cLng, radiusM, angleDeg);

    // Calculate heading angle toward center
    const headingAngle = bearing(lat, lng, cLat, cLng);
    // Normalize to -180..180 range expected by DJI
    const normalizedHeading =
      headingAngle > 180 ? headingAngle - 360 : headingAngle;

    // Calculate ideal gimbal pitch
    const horizontalDist = radiusM;
    const heightDiff = altitude; // drone is above POI at ground level
    const pitchRad = Math.atan2(heightDiff, horizontalDist);
    const gimbalPitch = Math.round(-pitchRad * (180 / Math.PI));

    waypoints.push({
      ...DEFAULT_WAYPOINT,
      latitude: lat,
      longitude: lng,
      height: altitude,
      speed: 5,
      useGlobalSpeed: false,
      useGlobalHeadingParam: false,
      headingMode: "fixed",
      headingAngle: Math.round(normalizedHeading),
      gimbalPitchAngle: gimbalPitch,
      turnMode: "toPointAndPassWithContinuityCurvature",
      useGlobalTurnParam: false,
      actions: [],
    });
  }

  return { waypoints, pois };
}

export function generateGrid(params: GridParams): TemplateResult {
  const {
    corner1,
    corner2,
    altitude,
    spacingM,
    addPhotos,
    rotationDeg,
    reverse,
  } = params;
  const [lat1, lng1] = corner1;
  const [lat2, lng2] = corner2;

  const waypoints: TemplateResult["waypoints"] = [];

  // Determine bounding box
  const minLat = Math.min(lat1, lat2);
  const maxLat = Math.max(lat1, lat2);
  const minLng = Math.min(lng1, lng2);
  const maxLng = Math.max(lng1, lng2);

  // Center of the bounding box (rotation pivot)
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  // Calculate the width and height of the area in meters
  const widthM = haversine(minLat, minLng, minLat, maxLng);
  const heightM = haversine(minLat, minLng, maxLat, minLng);

  // Determine if we fly N-S or E-W (fly along the longer axis)
  const flyEW = widthM >= heightM;

  // Number of passes
  const crossAxisDist = flyEW ? heightM : widthM;
  const numPasses = Math.max(2, Math.ceil(crossAxisDist / spacingM) + 1);

  const takePhotoAction: WaypointAction = {
    actionId: 0,
    actionType: "takePhoto",
    params: { payloadPositionIndex: 0 },
  };

  // Rotation helper: rotate a lat/lng point around the center by rotationDeg degrees.
  // Uses equirectangular approximation (accurate enough for small areas).
  const rotRad = (rotationDeg * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);
  const cosCenter = Math.cos((centerLat * Math.PI) / 180);

  function rotatePoint(lat: number, lng: number): [number, number] {
    if (rotationDeg === 0) return [lat, lng];
    // Convert to local offsets in degrees, scaling lng by cos(lat) for equal units
    const dLat = lat - centerLat;
    const dLng = (lng - centerLng) * cosCenter;
    // Rotate
    const rLat = dLat * cosR - dLng * sinR;
    const rLng = dLat * sinR + dLng * cosR;
    // Convert back
    return [centerLat + rLat, centerLng + rLng / cosCenter];
  }

  for (let pass = 0; pass < numPasses; pass++) {
    const fraction = numPasses <= 1 ? 0 : pass / (numPasses - 1);
    const reverse = pass % 2 === 1; // lawn-mower pattern: alternate direction

    let wpLat1: number, wpLng1: number, wpLat2: number, wpLng2: number;

    if (flyEW) {
      // Cross axis is N-S: each pass is a horizontal E-W line
      const lat = minLat + fraction * (maxLat - minLat);
      const startLng = reverse ? maxLng : minLng;
      const endLng = reverse ? minLng : maxLng;
      wpLat1 = lat;
      wpLng1 = startLng;
      wpLat2 = lat;
      wpLng2 = endLng;
    } else {
      // Cross axis is E-W: each pass is a vertical N-S line
      const lng = minLng + fraction * (maxLng - minLng);
      const startLat = reverse ? maxLat : minLat;
      const endLat = reverse ? minLat : maxLat;
      wpLat1 = startLat;
      wpLng1 = lng;
      wpLat2 = endLat;
      wpLng2 = lng;
    }

    // Apply rotation
    const [rLat1, rLng1] = rotatePoint(wpLat1, wpLng1);
    const [rLat2, rLng2] = rotatePoint(wpLat2, wpLng2);

    waypoints.push({
      ...DEFAULT_WAYPOINT,
      latitude: rLat1,
      longitude: rLng1,
      height: altitude,
      gimbalPitchAngle: -90,
      useGlobalHeadingParam: false,
      headingMode: "followWayline",
      turnMode: "toPointAndStopWithContinuityCurvature",
      useGlobalTurnParam: false,
      actions: addPhotos ? [{ ...takePhotoAction, actionId: 0 }] : [],
    });
    waypoints.push({
      ...DEFAULT_WAYPOINT,
      latitude: rLat2,
      longitude: rLng2,
      height: altitude,
      gimbalPitchAngle: -90,
      useGlobalHeadingParam: false,
      headingMode: "followWayline",
      turnMode: "toPointAndStopWithContinuityCurvature",
      useGlobalTurnParam: false,
      actions: addPhotos ? [{ ...takePhotoAction, actionId: 0 }] : [],
    });
  }

  if (reverse) {
    waypoints.reverse();
  }

  return { waypoints, pois: [] };
}

export function generateFacade(params: FacadeParams): TemplateResult {
  const {
    point1,
    point2,
    distanceM,
    minAltitude,
    maxAltitude,
    numRows,
    numColumns,
    addPhotos,
  } = params;
  const [lat1, lng1] = point1;
  const [lat2, lng2] = point2;

  const waypoints: TemplateResult["waypoints"] = [];

  // Wall bearing and perpendicular offset direction
  const wallBearing = bearing(lat1, lng1, lat2, lng2);
  // Perpendicular: offset 90° to the right of the wall direction
  const offsetBearing = (wallBearing + 90) % 360;

  // Generate the scan grid along the wall
  for (let row = 0; row < numRows; row++) {
    const altFraction = numRows <= 1 ? 0 : row / (numRows - 1);
    const alt = Math.round(
      minAltitude + altFraction * (maxAltitude - minAltitude),
    );
    const reverse = row % 2 === 1; // zigzag

    for (let col = 0; col < numColumns; col++) {
      const colIdx = reverse ? numColumns - 1 - col : col;
      const colFraction = numColumns <= 1 ? 0 : colIdx / (numColumns - 1);

      // Point along the wall
      const wallLat = lat1 + colFraction * (lat2 - lat1);
      const wallLng = lng1 + colFraction * (lng2 - lng1);

      // Offset perpendicular to wall
      const [wpLat, wpLng] = destinationPoint(
        wallLat,
        wallLng,
        distanceM,
        offsetBearing,
      );

      // Heading: face the wall (opposite of offset direction)
      const headingToWall = (offsetBearing + 180) % 360;
      const normalizedHeading =
        headingToWall > 180 ? headingToWall - 360 : headingToWall;

      // Gimbal: calculate pitch toward wall point at ground level
      const heightDiff = alt; // drone altitude above wall base
      const pitchRad = Math.atan2(heightDiff, distanceM);
      const gimbalPitch = Math.round(-pitchRad * (180 / Math.PI));

      waypoints.push({
        ...DEFAULT_WAYPOINT,
        latitude: wpLat,
        longitude: wpLng,
        height: alt,
        speed: 3,
        useGlobalSpeed: false,
        useGlobalHeadingParam: false,
        headingMode: "fixed",
        headingAngle: Math.round(normalizedHeading),
        gimbalPitchAngle: gimbalPitch,
        turnMode: "toPointAndStopWithContinuityCurvature",
        useGlobalTurnParam: false,
        actions: addPhotos
          ? [
              {
                actionId: 0,
                actionType: "takePhoto",
                params: { payloadPositionIndex: 0 },
              },
            ]
          : [],
      });
    }
  }

  return { waypoints, pois: [] };
}

// ── Pencil (freehand path) ──────────────────────────────

/**
 * Resample a polyline of raw points into exactly `n` equidistant points.
 * Uses cumulative arc-length along the raw path and linear interpolation.
 */
function resamplePath(raw: [number, number][], n: number): [number, number][] {
  if (raw.length === 0) return [];
  if (raw.length === 1 || n <= 1) return [raw[0]];

  // 1. Compute cumulative arc-length distances
  const cumDist: number[] = [0];
  for (let i = 1; i < raw.length; i++) {
    cumDist.push(
      cumDist[i - 1] +
        haversine(raw[i - 1][0], raw[i - 1][1], raw[i][0], raw[i][1]),
    );
  }
  const totalLength = cumDist[cumDist.length - 1];

  if (totalLength === 0) return [raw[0]];

  // 2. Place n points at equal arc-length intervals
  const result: [number, number][] = [];
  let segIdx = 0; // current segment index in the raw path

  for (let k = 0; k < n; k++) {
    const targetDist = (k / (n - 1)) * totalLength;

    // Advance segIdx to find the segment containing targetDist
    while (segIdx < raw.length - 2 && cumDist[segIdx + 1] < targetDist) {
      segIdx++;
    }

    const segLen = cumDist[segIdx + 1] - cumDist[segIdx];
    const t = segLen > 0 ? (targetDist - cumDist[segIdx]) / segLen : 0;

    const lat = raw[segIdx][0] + t * (raw[segIdx + 1][0] - raw[segIdx][0]);
    const lng = raw[segIdx][1] + t * (raw[segIdx + 1][1] - raw[segIdx][1]);
    result.push([lat, lng]);
  }

  return result;
}

/** Total arc-length of a polyline in meters */
export function pathLength(path: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += haversine(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1]);
  }
  return total;
}

export function generatePencil(params: PencilParams): TemplateResult {
  const { path, numPoints, altitude, speed, gimbalPitchAngle, reverse, poiId } =
    params;

  if (path.length < 2 || numPoints < 2) return { waypoints: [], pois: [] };

  const resampled = resamplePath(path, numPoints);

  const useTowardPoi = !!poiId;

  const waypoints: TemplateResult["waypoints"] = resampled.map(
    ([lat, lng]) => ({
      ...DEFAULT_WAYPOINT,
      latitude: lat,
      longitude: lng,
      height: altitude,
      speed,
      useGlobalSpeed: false,
      useGlobalHeadingParam: false,
      headingMode: useTowardPoi
        ? ("towardPOI" as const)
        : ("followWayline" as const),
      ...(useTowardPoi ? { poiId } : {}),
      gimbalPitchAngle,
      turnMode: "toPointAndPassWithContinuityCurvature" as const,
      useGlobalTurnParam: false,
      actions: [],
    }),
  );

  if (reverse) {
    waypoints.reverse();
  }

  return { waypoints, pois: [] };
}
