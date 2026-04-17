/**
 * Airspace provider registry.
 *
 * Import country-specific providers here and add them to the `providers` array.
 * The `fetchZones` function fans out to every registered provider in parallel.
 */

import type { AirspaceProvider, AirspaceZone, BBox } from "./types.js";
import { enaireProvider } from "./provider-enaire.js";

const providers: AirspaceProvider[] = [enaireProvider];

/**
 * Query all registered providers and return a merged list of zones that
 * intersect the given bounding box.
 */
export async function fetchZones(bounds: BBox): Promise<AirspaceZone[]> {
  const results = await Promise.allSettled(
    providers.map((p) => p.fetchZones(bounds)),
  );

  const zones: AirspaceZone[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      zones.push(...r.value);
    }
  }
  return zones;
}

export { providers };
export type { AirspaceProvider, AirspaceZone, BBox } from "./types.js";
