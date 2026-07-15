export interface ThermalCameraFov {
  label: string;
  hfovDeg: number;
  vfovDeg: number;
  /** Set when the underlying drone/payload identity itself is unconfirmed (see DRONE_MODELS) — the recommendation UI should carry that caveat forward instead of implying the same confidence as a verified payload. */
  experimental?: boolean;
}

/**
 * DJI only publishes a single diagonal FOV (DFOV) for these thermal
 * payloads. Horizontal/vertical values here are derived from that
 * published DFOV using the sensor's known 640x512 (5:4) aspect ratio via
 * rectilinear-lens trigonometry:
 *   tan(DFOV/2) = sqrt(tan(HFOV/2)^2 + tan(VFOV/2)^2), HFOV_tan = 1.25 * VFOV_tan
 * Validated against an independently-published H20T H/V breakdown (within
 * ~0.5° of the value derived here from DJI's own DFOV spec) — see PR
 * discussion / changelog for sourcing. Keyed by `payloadEnumValue`.
 */
export const THERMAL_CAMERA_FOV: Record<number, ThermalCameraFov> = {
  43: { label: "H20T", hfovDeg: 32.2, vfovDeg: 26.0 }, // DFOV 40.6° (DJI spec)
  53: { label: "M30T Camera", hfovDeg: 49.4, vfovDeg: 40.4 }, // DFOV 61° (DJI spec)
  67: { label: "M3T Camera", hfovDeg: 49.4, vfovDeg: 40.4 }, // DFOV 61° (DJI spec)
  81: { label: "M3TD Camera", hfovDeg: 49.4, vfovDeg: 40.4 }, // same thermal module as M3T
  89: {
    label: "Matrice 4T Camera",
    hfovDeg: 35.8,
    vfovDeg: 29.0, // DFOV 45° (DJI spec)
  },
};

export interface WideCameraFov {
  label: string;
  vfovDeg: number;
  /**
   * Vertical photo resolution (pixels) of the wide/RGB sensor's max-size
   * still photo — needed for GSD (ground sample distance) calculations.
   * Sourced from each product's published spec sheet; omitted for cameras
   * where the resolution isn't confidently known, in which case GSD/overlap
   * helpers below return `null` rather than guessing.
   */
  imageHeightPx?: number;
  experimental?: boolean;
}

/**
 * Vertical FOV of each drone's primary wide/RGB photo camera — distinct from
 * `THERMAL_CAMERA_FOV` above (thermal-only, used for solar-panel spacing).
 * Used to keep a whole object (e.g. a building) framed when orbiting it.
 * Derived from each camera's published diagonal FOV (DJI spec sheets) via
 * the same DFOV -> HFOV/VFOV trigonometry as `THERMAL_CAMERA_FOV`, using
 * each sensor's real 4:3 photo aspect ratio (confirmed via each product's
 * stated max photo resolution). Keyed by `payloadEnumValue`.
 *
 * H20N/H20T, M30T, M3T/M3M/M3D/M3TD, and H30T reuse the wide-camera module
 * of their base/non-thermal sibling (DJI ships the same RGB sensor across
 * those variants) — not independently spec-fetched, only the base model's
 * DFOV was. PSDK (65534) is a generic third-party payload mount with no
 * fixed camera and is intentionally omitted; callers must handle a missing
 * entry as "FOV unknown" rather than guessing.
 */
export const WIDE_CAMERA_FOV: Record<number, WideCameraFov> = {
  42: { label: "H20", vfovDeg: 55.7, imageHeightPx: 3888 }, // DFOV 82.9° (DJI spec), 20MP 5184x3888
  61: { label: "H20N", vfovDeg: 55.7, imageHeightPx: 3888 }, // same wide module as H20
  43: { label: "H20T", vfovDeg: 55.7, imageHeightPx: 3888 }, // same wide module as H20
  52: { label: "M30 Camera", vfovDeg: 56.8, imageHeightPx: 3000 }, // DFOV 84° (DJI spec), 12MP 4000x3000
  53: { label: "M30T Camera", vfovDeg: 56.8, imageHeightPx: 3000 }, // same wide module as M30
  66: { label: "M3E Camera", vfovDeg: 56.8, imageHeightPx: 3956 }, // DFOV 84° (DJI spec), 20MP 5280x3956
  67: { label: "M3T Camera", vfovDeg: 56.8, imageHeightPx: 3956 }, // DFOV 84° (DJI spec), 20MP 5280x3956
  68: { label: "M3M Camera", vfovDeg: 56.8, imageHeightPx: 3956 }, // same wide module as M3E
  80: { label: "M3D Camera", vfovDeg: 56.8, imageHeightPx: 3956 }, // same wide module as M3E
  81: { label: "M3TD Camera", vfovDeg: 56.8, imageHeightPx: 3956 }, // same wide module as M3T
  // H30/H30T resolution not confidently sourced yet — omit imageHeightPx so
  // GSD/overlap helpers correctly report "unknown" instead of guessing.
  82: { label: "H30", vfovDeg: 55.1 }, // DFOV 82.1° (DJI spec)
  83: { label: "H30T", vfovDeg: 55.1 }, // same wide module as H30
  100: { label: "Mini 4 Pro Camera", vfovDeg: 55.1, imageHeightPx: 6048 }, // DFOV 82.1° (DJI spec), 48MP 8064x6048
  89: { label: "Matrice 4T Camera", vfovDeg: 55.0, imageHeightPx: 6048 }, // DFOV 82° (DJI spec), 48MP 8064x6048 (same generation sensor as Mini 4 Pro)
};

const DEFAULT_SOLAR_OVERLAP = 0.2;

export interface SolarSpacingRecommendation {
  lineSpacingM: number;
  photoSpacingM: number;
}

/**
 * Recommended flight-line spacing (cross-track) and photo spacing
 * (along-track) so consecutive nadir thermal photos overlap enough to
 * leave no coverage gaps, for the given altitude and payload. Returns
 * `null` when the payload's thermal FOV isn't known — never guesses a
 * number for an unlisted camera.
 */
export function recommendSolarSpacing(
  altitude: number,
  payloadEnumValue: number,
  overlap: number = DEFAULT_SOLAR_OVERLAP,
): SolarSpacingRecommendation | null {
  const fov = THERMAL_CAMERA_FOV[payloadEnumValue];
  if (!fov) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const footprintWidth = 2 * altitude * Math.tan(toRad(fov.hfovDeg) / 2);
  const footprintHeight = 2 * altitude * Math.tan(toRad(fov.vfovDeg) / 2);
  return {
    lineSpacingM: Math.round(footprintWidth * (1 - overlap) * 10) / 10,
    photoSpacingM: Math.round(footprintHeight * (1 - overlap) * 10) / 10,
  };
}

/**
 * `WIDE_CAMERA_FOV` only stores vertical FOV (all that Orbit-framing ever
 * needed). Grid's GSD/overlap math also needs horizontal FOV, so derive it
 * from VFOV using the same 4:3 sensor aspect ratio these VFOV values were
 * themselves derived from (tan(HFOV/2) = tan(VFOV/2) * width/height).
 */
function deriveHfovFromVfov(vfovDeg: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  return toDeg(2 * Math.atan(Math.tan(toRad(vfovDeg) / 2) * (4 / 3)));
}

/**
 * Ground sample distance (cm/pixel) for the given payload's wide/RGB camera
 * at the given altitude. Returns `null` when the camera's photo resolution
 * isn't known (see `WIDE_CAMERA_FOV`) rather than guessing.
 */
export function computeGsdCm(
  altitude: number,
  payloadEnumValue: number,
): number | null {
  const fov = WIDE_CAMERA_FOV[payloadEnumValue];
  if (!fov || !fov.imageHeightPx) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const footprintHeightM = 2 * altitude * Math.tan(toRad(fov.vfovDeg) / 2);
  return (footprintHeightM / fov.imageHeightPx) * 100;
}

/** Inverse of `computeGsdCm`: altitude needed to hit a target GSD (cm/pixel). */
export function computeAltitudeForGsd(
  targetGsdCm: number,
  payloadEnumValue: number,
): number | null {
  const fov = WIDE_CAMERA_FOV[payloadEnumValue];
  if (!fov || !fov.imageHeightPx) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const footprintHeightM = (targetGsdCm / 100) * fov.imageHeightPx;
  return footprintHeightM / (2 * Math.tan(toRad(fov.vfovDeg) / 2));
}

export interface GridSpacingRecommendation {
  lineSpacingM: number;
  photoSpacingM: number;
}

/**
 * Recommended flight-line spacing (cross-track) and photo spacing
 * (along-track) for a Grid photogrammetry survey, given the desired front
 * (along-track) and side (cross-track) overlap percentages. Unlike
 * `recommendSolarSpacing`'s fixed 20% overlap, Grid overlap is a direct
 * user input — professional photogrammetry commonly wants 70-80%
 * front / 60-70% side overlap, far higher than solar-panel inspection
 * needs. Returns `null` when the payload's wide-camera FOV isn't known.
 */
export function recommendGridSpacing(
  altitude: number,
  payloadEnumValue: number,
  frontOverlapPct: number,
  sideOverlapPct: number,
): GridSpacingRecommendation | null {
  const fov = WIDE_CAMERA_FOV[payloadEnumValue];
  if (!fov) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const hfovDeg = deriveHfovFromVfov(fov.vfovDeg);
  const footprintWidthM = 2 * altitude * Math.tan(toRad(hfovDeg) / 2);
  const footprintHeightM = 2 * altitude * Math.tan(toRad(fov.vfovDeg) / 2);
  return {
    lineSpacingM:
      Math.round(footprintWidthM * (1 - sideOverlapPct / 100) * 10) / 10,
    photoSpacingM:
      Math.round(footprintHeightM * (1 - frontOverlapPct / 100) * 10) / 10,
  };
}
