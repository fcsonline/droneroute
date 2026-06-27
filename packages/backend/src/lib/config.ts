import { DEFAULT_MAP_VIEW, type MapViewState } from "@droneroute/shared";

/**
 * Parse an environment variable into a number, falling back to `fallback` when
 * the value is unset, empty, non-numeric, or outside the [min, max] range.
 */
function envNumber(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

/**
 * Resolve the default map view (center + zoom) shown when the app first loads.
 *
 * Self-hosted instances can override it via the DEFAULT_MAP_LAT,
 * DEFAULT_MAP_LNG, and DEFAULT_MAP_ZOOM environment variables so the map opens
 * on their local area instead of the built-in default. Each value is validated
 * independently and falls back to the built-in default when invalid.
 */
export function resolveDefaultMapView(
  env: NodeJS.ProcessEnv = process.env,
): MapViewState {
  return {
    latitude: envNumber(
      env.DEFAULT_MAP_LAT,
      DEFAULT_MAP_VIEW.latitude,
      -90,
      90,
    ),
    longitude: envNumber(
      env.DEFAULT_MAP_LNG,
      DEFAULT_MAP_VIEW.longitude,
      -180,
      180,
    ),
    zoom: envNumber(env.DEFAULT_MAP_ZOOM, DEFAULT_MAP_VIEW.zoom, 0, 22),
  };
}
