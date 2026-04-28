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

// ── Camera Profiles ──────────────────────────────────────

export interface CameraProfile {
  label: string;
  sensorWidthMm: number;
  sensorHeightMm: number;
  focalLengthMm: number;
  imageWidthPx: number;
  imageHeightPx: number;
}

export const CAMERA_PRESETS = {
  m4e: {
    label: "DJI M4E",
    sensorWidthMm: 35.9,
    sensorHeightMm: 24.0,
    focalLengthMm: 24,
    imageWidthPx: 8064,
    imageHeightPx: 6048,
  },
  mavic3e: {
    // TODO: verify sensor specs against DJI Mavic 3E spec sheet — values estimated from 4/3" CMOS
    label: "DJI Mavic 3E",
    sensorWidthMm: 17.3,
    sensorHeightMm: 13.0,
    focalLengthMm: 12.29,
    imageWidthPx: 5280,
    imageHeightPx: 3956,
  },
  m30: {
    // TODO: verify sensor specs against DJI M30 spec sheet — wide camera estimated values
    label: "DJI M30",
    sensorWidthMm: 6.4,
    sensorHeightMm: 4.8,
    focalLengthMm: 4.5,
    imageWidthPx: 8000,
    imageHeightPx: 6000,
  },
} satisfies Record<string, CameraProfile>;

export type CameraPresetKey = keyof typeof CAMERA_PRESETS;

// ── Template Types ───────────────────────────────────────

export type TemplateType = "orbit" | "grid" | "facade" | "pencil" | "area";

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

export interface AreaSurveyParams {
  vertices: [number, number][]; // polygon vertices [lat, lng]
  altitude: number;
  speedMs: number; // cruise speed in m/s
  frontOverlap: number; // 0..0.95, e.g. 0.8 = 80%
  sideOverlap: number; // 0..0.95, e.g. 0.7 = 70%
  camera: CameraProfile;
  marginM: number; // extend each pass beyond polygon edge (metres)
  rotationDeg?: number; // if omitted, auto-computed via MBR of convex hull
  addPhotos: boolean;
  reverse: boolean;
  crossHatch: boolean; // add second orthogonal pass at rotationDeg + 90°
  oblique: boolean; // enable full 5-path oblique mission (nadir + 4 directional grids)
  obliquePitch?: number; // gimbal tilt for oblique shots — recommended -90 to -45; values
  // outside this range are accepted but may produce unusable images (see console warning)
  spacingM?: number; // optional override — skips sideOverlap-derived spacing
}

export type TemplateParams =
  | OrbitParams
  | GridParams
  | FacadeParams
  | PencilParams
  | AreaSurveyParams;

export interface AreaSurveyMetadata {
  gsdCm: number;
  lineSpacingM: number;
  photoIntervalM: number;
  autoRotationDeg: number; // MBR-computed optimal rotation, regardless of manual override
}

/** Waypoint as returned by template generators — index/name are assigned on commit. */
export type TemplateWaypoint = Omit<Waypoint, "index" | "name"> & { name?: string };

/** Five independent lawnmower grids for full 3D oblique reconstruction.
 *  a/b/c/d are at effectiveRotation + 0/90/180/270° respectively — not fixed cardinals. */
export interface ObliqueSurveyResult {
  nadir: TemplateWaypoint[];
  a: TemplateWaypoint[];  // look direction = effectiveRotation + 0°
  b: TemplateWaypoint[];  // look direction = effectiveRotation + 90°
  c: TemplateWaypoint[];  // look direction = effectiveRotation + 180°
  d: TemplateWaypoint[];  // look direction = effectiveRotation + 270°
}

export interface TemplateResult {
  waypoints: TemplateWaypoint[];
  pois: Omit<PointOfInterest, "id">[];
  metadata?: AreaSurveyMetadata;
  oblique?: ObliqueSurveyResult;
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

export const DEFAULT_AREA_SURVEY_PARAMS: Omit<AreaSurveyParams, "vertices"> = {
  altitude: 80,
  speedMs: 7,
  frontOverlap: 0.8,
  sideOverlap: 0.7,
  camera: CAMERA_PRESETS.m4e,
  marginM: 0,
  // rotationDeg omitted → auto-computed from MBR on first polygon draw
  addPhotos: true,
  reverse: false,
  crossHatch: false,
  oblique: false,
  obliquePitch: -45,
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

// ── Area Survey Geometry Helpers ─────────────────────────

/** 2-D convex hull (Andrew's monotone chain) in local metric coords. */
function convexHullLocal(pts: [number, number][]): [number, number][] {
  if (pts.length < 3) return pts.slice();
  const s = pts.slice().sort((a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]));
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of s) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = s.length - 1; i >= 0; i--) {
    const p = s[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

/**
 * Find the rotationDeg value that aligns lawnmower passes with the long axis of the
 * minimum bounding rectangle of the polygon. Pass this as `rotationDeg` to produce
 * the fewest passes (minimum total flight distance) for the given polygon shape.
 */
export function computeMBRRotation(vertices: [number, number][]): number {
  if (vertices.length < 2) return 0;
  const centLat = vertices.reduce((s, v) => s + v[0], 0) / vertices.length;
  const centLng = vertices.reduce((s, v) => s + v[1], 0) / vertices.length;
  const R = 6371000;
  const cosLat = Math.cos((centLat * Math.PI) / 180);
  const DEG2RAD = Math.PI / 180;
  const local: [number, number][] = vertices.map(([lat, lng]) => [
    (lng - centLng) * cosLat * DEG2RAD * R,
    (lat - centLat) * DEG2RAD * R,
  ]);
  const hull = convexHullLocal(local);
  if (hull.length < 2) return 0;

  let minArea = Infinity;
  let bestRotDeg = 0;
  for (let i = 0; i < hull.length; i++) {
    const [ax, ay] = hull[i];
    const [bx, by] = hull[(i + 1) % hull.length];
    const edgeAngle = Math.atan2(by - ay, bx - ax);
    const c = Math.cos(-edgeAngle);
    const ss = Math.sin(-edgeAngle);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of hull) {
      const rx = x * c - y * ss;
      const ry = x * ss + y * c;
      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (ry < minY) minY = ry;
      if (ry > maxY) maxY = ry;
    }
    const w = maxX - minX;
    const h = maxY - minY;
    if (w * h < minArea) {
      minArea = w * h;
      // rotationDeg = long-axis angle (CCW from east) so passes align with it
      const longAxisDeg = (w >= h ? edgeAngle : edgeAngle + Math.PI / 2) * (180 / Math.PI);
      bestRotDeg = longAxisDeg;
    }
  }
  // Normalize to 0..180 (lawnmower is symmetric about 180°)
  return ((bestRotDeg % 180) + 180) % 180;
}

/**
 * Translate all polygon vertices by (dxM east, dyM north) in metric.
 * Uses equirectangular approximation — accurate for offsets up to ~50 km.
 */
function translatePolygon(
  vertices: [number, number][],
  dxM: number,
  dyM: number,
): [number, number][] {
  const centLat = vertices.reduce((s, v) => s + v[0], 0) / vertices.length;
  const R = 6371000;
  const cosLat = Math.cos((centLat * Math.PI) / 180);
  const RAD2DEG = 180 / Math.PI;
  return vertices.map(([lat, lng]): [number, number] => [
    lat + (dyM / R) * RAD2DEG,
    lng + (dxM / (R * cosLat)) * RAD2DEG,
  ]);
}

/** Uniformly expand a convex polygon outward from its centroid by m metres (local metric). */
function inflatePoly(pts: [number, number][], m: number): [number, number][] {
  if (m <= 0) return pts;
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(([x, y]): [number, number] => {
    const dx = x - cx, dy = y - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    return d > 0 ? [x + (dx / d) * m, y + (dy / d) * m] : [x, y];
  });
}

// ── Area Survey (polygon-clipped lawnmower) ─────────────

/**
 * Returns photogrammetric metrics from area survey params without generating waypoints.
 * Accepts the full AreaSurveyParams so autoRotationDeg can be derived from the polygon.
 * Pass a partial params object (omitting vertices) to get metrics without MBR computation
 * — autoRotationDeg will be 0 in that case.
 */
export function computeAreaSurveyMetrics(
  params: AreaSurveyParams | Omit<AreaSurveyParams, "vertices">,
): AreaSurveyMetadata {
  const { altitude, frontOverlap, sideOverlap, camera, spacingM } = params;
  const lineSpacingM =
    spacingM ??
    (camera.sensorWidthMm / camera.focalLengthMm) * altitude * (1 - sideOverlap);
  const photoIntervalM =
    (camera.sensorHeightMm / camera.focalLengthMm) * altitude * (1 - frontOverlap);
  const gsdCm =
    (camera.sensorWidthMm * altitude * 100) /
    (camera.focalLengthMm * camera.imageWidthPx);
  const autoRotationDeg =
    "vertices" in params && params.vertices.length >= 3
      ? computeMBRRotation(params.vertices)
      : 0;
  return { gsdCm, lineSpacingM, photoIntervalM, autoRotationDeg };
}

/**
 * Core geometry: clips a lawnmower grid to a polygon, placing dense photo
 * waypoints at photoIntervalM intervals along each pass.
 *
 * gimbalPitch defaults to -90 (nadir). When fixedHeadingDeg is supplied the
 * aircraft uses headingMode "fixed" pointing at that bearing — used by oblique
 * directional grids to face the polygon center throughout each pass.
 */
function sweepPolygon(
  vertices: [number, number][],
  altitude: number,
  spacingM: number,
  photoIntervalM: number,
  marginM: number,
  rotationDeg: number,
  addPhotos: boolean,
  speedMs: number,
  gimbalPitch = -90,
  fixedHeadingDeg?: number,
  scanExpansionM = 0,
): TemplateWaypoint[] {
  const centLat = vertices.reduce((s, v) => s + v[0], 0) / vertices.length;
  const centLng = vertices.reduce((s, v) => s + v[1], 0) / vertices.length;
  const R = 6371000;
  const cosLat = Math.cos((centLat * Math.PI) / 180);
  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;

  const toLocal = ([lat, lng]: [number, number]): [number, number] => [
    (lng - centLng) * cosLat * DEG2RAD * R,
    (lat - centLat) * DEG2RAD * R,
  ];

  const fromLocal = ([x, y]: [number, number]): [number, number] => [
    centLat + (y / R) * RAD2DEG,
    centLng + (x / (R * cosLat)) * RAD2DEG,
  ];

  const rot = ([x, y]: [number, number], rad: number): [number, number] => {
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return [x * c - y * s, x * s + y * c];
  };

  const rotRad = -rotationDeg * DEG2RAD;
  const backRad = rotationDeg * DEG2RAD;

  const rotVerts = inflatePoly(
    vertices.map((v) => rot(toLocal(v), rotRad)),
    scanExpansionM,
  );

  const ys = rotVerts.map((v) => v[1]);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const height = maxY - minY;
  if (height < 1) return [];

  const numLines = Math.max(2, Math.ceil(height / spacingM) + 1);
  const n = rotVerts.length;

  // TODO: verify toPointAndPassWithContinuityCurvature correctly fires actions
  // in DJI WPML at pass-through speed. If firmware requires a stop, switch to
  // toPointAndStopWithContinuityCurvature for photo waypoints only.
  const wpBase = {
    ...DEFAULT_WAYPOINT,
    height: altitude,
    speed: speedMs,
    useGlobalSpeed: false,
    gimbalPitchAngle: gimbalPitch,
    useGlobalHeadingParam: false,
    headingMode: fixedHeadingDeg !== undefined ? ("fixed" as const) : ("followWayline" as const),
    ...(fixedHeadingDeg !== undefined ? { headingAngle: fixedHeadingDeg } : {}),
    turnMode: "toPointAndPassWithContinuityCurvature" as const,
    useGlobalTurnParam: false,
  };

  const waypoints: TemplateWaypoint[] = [];
  let lineIndex = 0;

  const toLatLng = (x: number, y: number) => {
    const [lat, lng] = fromLocal(rot([x, y], backRad));
    return { latitude: lat, longitude: lng };
  };

  for (let i = 0; i < numLines; i++) {
    const rawY =
      numLines <= 1 ? (minY + maxY) / 2 : minY + (i / (numLines - 1)) * height;
    const y =
      i === 0
        ? rawY + height * 0.0001
        : i === numLines - 1
          ? rawY - height * 0.0001
          : rawY;

    const xs: number[] = [];
    for (let j = 0; j < n; j++) {
      const [x1, y1] = rotVerts[j];
      const [x2, y2] = rotVerts[(j + 1) % n];
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
        const t = (y - y1) / (y2 - y1);
        xs.push(x1 + t * (x2 - x1));
      }
    }

    xs.sort((a, b) => a - b);
    if (xs.length < 2) continue;

    const isReversed = lineIndex % 2 === 1;
    lineIndex++;

    for (let k = 0; k + 1 < xs.length; k += 2) {
      const leftX = xs[k] - marginM;
      const rightX = xs[k + 1] + marginM;
      const segLen = rightX - leftX;
      const xStart = isReversed ? rightX : leftX;
      const xEnd = isReversed ? leftX : rightX;

      // Navigation waypoint at pass start — no photo, no gimbal change
      waypoints.push({ ...wpBase, ...toLatLng(xStart, y), actions: [] });

      if (addPhotos && segLen > 0) {
        const numPhotos = Math.max(1, Math.round(segLen / photoIntervalM));
        for (let p = 0; p < numPhotos; p++) {
          const x = xStart + ((p + 0.5) / numPhotos) * (xEnd - xStart);
          waypoints.push({
            ...wpBase,
            ...toLatLng(x, y),
            actions: [{ actionId: 0, actionType: "takePhoto" as const, params: { payloadPositionIndex: 0 } }],
          });
        }
      }

      // Navigation waypoint at pass end — no photo, before U-turn
      waypoints.push({ ...wpBase, ...toLatLng(xEnd, y), actions: [] });
    }
  }

  return waypoints;
}

export function generateAreaSurvey(params: AreaSurveyParams): TemplateResult {
  const {
    vertices,
    altitude,
    speedMs,
    addPhotos,
    reverse,
    crossHatch,
    oblique,
    obliquePitch = -45,
  } = params;

  if (vertices.length < 3) return { waypoints: [], pois: [] };

  if (oblique && (obliquePitch > -45 || obliquePitch < -90)) {
    console.warn(
      `[droneroute] obliquePitch ${obliquePitch}° is outside the recommended -90°…-45° range. ` +
        "Values shallower than -45° may produce unusable reconstruction geometry; " +
        "values steeper than -90° are invalid for the gimbal.",
    );
  }

  const { gsdCm, lineSpacingM, photoIntervalM, autoRotationDeg } =
    computeAreaSurveyMetrics(params);

  const effectiveRotation = params.rotationDeg ?? autoRotationDeg;

  const nadir = sweepPolygon(
    vertices, altitude, lineSpacingM, photoIntervalM, params.marginM,
    effectiveRotation, addPhotos, speedMs,
    -90, undefined, params.marginM,  // scanExpansionM = marginM ensures full boundary coverage
  );

  if (crossHatch) {
    nadir.push(
      ...sweepPolygon(
        vertices, altitude, lineSpacingM, photoIntervalM, params.marginM,
        effectiveRotation + 90, addPhotos, speedMs,
        -90, undefined, params.marginM,
      ),
    );
  }

  if (reverse) nadir.reverse();

  const metadata = { gsdCm, lineSpacingM, photoIntervalM, autoRotationDeg };

  if (!oblique) {
    return { waypoints: nadir, pois: [], metadata };
  }

  // ── 5-path full oblique mission ──────────────────────────────────────────
  // Four directional grids at effectiveRotation + 0/90/180/270°.
  // Aligning with the polygon MBR rotation minimises pass count vs fixed cardinals.
  const DEG2RAD = Math.PI / 180;
  const pitchRad = Math.abs(obliquePitch) * DEG2RAD;
  const cosOblique = Math.cos(pitchRad);
  const obliqueOffset = altitude * Math.tan(pitchRad);

  const { sensorWidthMm, sensorHeightMm, focalLengthMm } = params.camera;
  const obliqueLineSpacing =
    (sensorWidthMm / focalLengthMm) * (altitude / cosOblique) * (1 - params.sideOverlap);
  const obliquePhotoInterval =
    (sensorHeightMm / focalLengthMm) * (altitude / cosOblique) * (1 - params.frontOverlap);

  const toHeading = (deg: number) => {
    const n = ((deg % 360) + 360) % 360;
    return n > 180 ? n - 360 : n;
  };

  // For each look direction, drone is positioned opposite → translate polygon toward lookDeg+180°.
  // Pass rotation = lookDeg so scan lines run perpendicular to the look direction.
  // TODO: refine offset to expand only the relevant edge rather than translating whole polygon
  const makeObliqueGrid = (lookDeg: number): TemplateWaypoint[] => {
    const transRad = ((lookDeg + 180) % 360) * DEG2RAD;
    const dxM = obliqueOffset * Math.sin(transRad);
    const dyM = obliqueOffset * Math.cos(transRad);
    return sweepPolygon(
      translatePolygon(vertices, dxM, dyM),
      altitude, obliqueLineSpacing, obliquePhotoInterval, 0,
      lookDeg, addPhotos, speedMs,
      obliquePitch, toHeading(lookDeg),
    );
  };

  // TODO: per-waypoint heading toward polygon centroid would be more accurate than
  // the fixed heading used above — replace once bearing math is verified in WPML.

  return {
    waypoints: nadir,
    pois: [],
    metadata,
    oblique: {
      nadir,
      a: makeObliqueGrid(effectiveRotation),
      b: makeObliqueGrid(effectiveRotation + 90),
      c: makeObliqueGrid(effectiveRotation + 180),
      d: makeObliqueGrid(effectiveRotation + 270),
    },
  };
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
