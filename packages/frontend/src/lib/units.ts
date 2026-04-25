export type UnitSystem = "metric" | "imperial";

const M_TO_FT = 3.28084;
const MS_TO_MPH = 2.23694;

// --- Conversion helpers (metric ↔ display units) ---

export function mToDisplay(m: number, sys: UnitSystem): number {
  return sys === "imperial" ? m * M_TO_FT : m;
}

export function displayToM(val: number, sys: UnitSystem): number {
  return sys === "imperial" ? val / M_TO_FT : val;
}

export function msToDisplay(ms: number, sys: UnitSystem): number {
  return sys === "imperial" ? ms * MS_TO_MPH : ms;
}

export function displayToMs(val: number, sys: UnitSystem): number {
  return sys === "imperial" ? val / MS_TO_MPH : val;
}

// --- Unit label strings ---

export function altUnit(sys: UnitSystem): string {
  return sys === "imperial" ? "ft" : "m";
}

export function speedUnit(sys: UnitSystem): string {
  return sys === "imperial" ? "mph" : "m/s";
}

// --- Input field helpers ---

/** Round altitude to the right precision for display in an input. */
export function displayAlt(m: number, sys: UnitSystem): number {
  return sys === "imperial" ? Math.round(m * M_TO_FT) : Math.round(m * 10) / 10;
}

/** Round speed to the right precision for display in an input. */
export function displaySpeed(ms: number, sys: UnitSystem): number {
  const v = msToDisplay(ms, sys);
  return Math.round(v * 10) / 10;
}

// --- Formatted display strings ---

/** Format an altitude (stored in meters) for display. */
export function fmtAlt(m: number, sys: UnitSystem): string {
  if (sys === "imperial") return `${Math.round(m * M_TO_FT)}ft`;
  return `${Math.round(m)}m`;
}

/** Format a speed (stored in m/s) for display. */
export function fmtSpeed(ms: number, sys: UnitSystem): string {
  if (sys === "imperial") return `${(ms * MS_TO_MPH).toFixed(1)}mph`;
  return `${ms.toFixed(1)}m/s`;
}

/** Format a distance (stored in meters) for display. */
export function fmtDist(m: number, sys: UnitSystem): string {
  if (sys === "imperial") {
    const ft = m * M_TO_FT;
    if (ft >= 5280) return `${(ft / 5280).toFixed(1)}mi`;
    return `${Math.round(ft)}ft`;
  }
  if (m >= 1000) return `${(m / 1000).toFixed(1)}km`;
  return `~${Math.round(m)}m`;
}

/** Format an area (stored in m²) for display. */
export function fmtArea(m2: number, sys: UnitSystem): string {
  if (sys === "imperial") {
    const acres = m2 * 0.000247105;
    if (acres >= 1) return `${acres.toFixed(2)} ac`;
    return `${Math.round(m2 * 10.7639)} ft²`;
  }
  if (m2 >= 1_000_000) return `${(m2 / 1_000_000).toFixed(2)} km²`;
  if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(2)} ha`;
  return `${Math.round(m2)} m²`;
}

// --- Min/max/step values for input fields ---

export const ALT_MIN = (sys: UnitSystem) => (sys === "imperial" ? 4 : 1);
export const ALT_MAX = (sys: UnitSystem) => (sys === "imperial" ? 4921 : 1500);
export const ALT_STEP = (sys: UnitSystem) => (sys === "imperial" ? 5 : 1);

export const WP_ALT_MAX = (sys: UnitSystem) =>
  sys === "imperial" ? 1640 : 500;

export const SPEED_MIN = (sys: UnitSystem) => (sys === "imperial" ? 2.5 : 1);
export const SPEED_MAX = (sys: UnitSystem) => (sys === "imperial" ? 33.6 : 15);
export const SPEED_STEP = (sys: UnitSystem) => (sys === "imperial" ? 0.5 : 0.5);
