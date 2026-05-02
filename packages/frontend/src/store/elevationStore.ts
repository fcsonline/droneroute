import { create } from "zustand";
import { fetchElevations } from "@/lib/elevation";
import type { Waypoint } from "@droneroute/shared";

/** Round to 6 decimals — enough for ~0.1m precision */
function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

interface ElevationState {
  /** Cached elevations keyed by "lat,lng" */
  cache: Map<string, number>;
  /** Ordered elevations for current waypoints (same length as waypoints) */
  elevations: number[];
  loading: boolean;
  error: string | null;

  /** Fetch elevations for a set of waypoints, using cache when possible */
  fetchForWaypoints: (waypoints: Waypoint[]) => Promise<void>;
  /** Clear all cached data */
  clear: () => void;
}

export const useElevationStore = create<ElevationState>((set, get) => ({
  cache: new Map(),
  elevations: [],
  loading: false,
  error: null,

  fetchForWaypoints: async (waypoints: Waypoint[]) => {
    if (waypoints.length === 0) {
      set({ elevations: [], loading: false, error: null });
      return;
    }

    const { cache } = get();
    const keys = waypoints.map((wp) => coordKey(wp.latitude, wp.longitude));

    // Find which coordinates we need to fetch
    const missingIndices: number[] = [];
    const missingLocations: { latitude: number; longitude: number }[] = [];
    for (let i = 0; i < waypoints.length; i++) {
      if (!cache.has(keys[i])) {
        missingIndices.push(i);
        missingLocations.push({
          latitude: waypoints[i].latitude,
          longitude: waypoints[i].longitude,
        });
      }
    }

    // If everything is cached, just build the result
    if (missingLocations.length === 0) {
      set({ elevations: keys.map((k) => cache.get(k)!), error: null });
      return;
    }

    set({ loading: true, error: null });

    try {
      const results = await fetchElevations(missingLocations);
      const newCache = new Map(get().cache);
      for (let i = 0; i < missingIndices.length; i++) {
        newCache.set(keys[missingIndices[i]], results[i]);
      }
      const elevations = keys.map((k) => newCache.get(k)!);
      set({ cache: newCache, elevations, loading: false, error: null });
    } catch (err: any) {
      console.error("Elevation fetch failed:", err);
      set({ loading: false, error: err.message || "Elevation fetch failed" });
    }
  },

  clear: () => set({ cache: new Map(), elevations: [], error: null }),
}));
