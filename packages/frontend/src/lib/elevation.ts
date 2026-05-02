import { api } from "./api";

interface ElevationResult {
  latitude: number;
  longitude: number;
  elevation: number;
}

/**
 * Fetch ground elevation for waypoint coordinates via the backend proxy.
 */
export async function fetchElevations(
  locations: { latitude: number; longitude: number }[],
): Promise<number[]> {
  if (locations.length === 0) return [];

  const data = await api.post<{ results: ElevationResult[] }>("/elevation", {
    locations,
  });
  return data.results.map((r) => r.elevation);
}
