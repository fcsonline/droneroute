interface ElevationLocation {
  latitude: number;
  longitude: number;
}

interface ElevationResult {
  latitude: number;
  longitude: number;
  elevation: number;
}

/**
 * Fetch ground elevation for a list of coordinates from the Open Elevation API.
 * Returns an array of elevation values (meters ASL) in the same order as input.
 */
export async function fetchElevations(
  locations: ElevationLocation[],
): Promise<number[]> {
  if (locations.length === 0) return [];

  const response = await fetch("https://api.open-elevation.com/api/v1/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locations }),
  });

  if (!response.ok) {
    throw new Error(`Elevation API error: ${response.status}`);
  }

  const data = (await response.json()) as { results: ElevationResult[] };
  return data.results.map((r) => r.elevation);
}
