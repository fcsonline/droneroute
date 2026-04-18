import { create } from "zustand";
import { api } from "@/lib/api";

export type ZoneSeverity = "prohibited" | "restricted";

export interface AirspaceZone {
  id: string;
  name: string;
  severity: ZoneSeverity;
  geometry: GeoJSON.Geometry;
  altitudeLower?: number;
  altitudeUpper?: number;
  description?: string;
  category?: string;
  source: string;
}

interface AirspaceState {
  enabled: boolean;
  zones: AirspaceZone[];
  isLoading: boolean;
  /** The bounds we already fetched (padded). Skip refetch if viewport fits inside. */
  cachedBounds: { south: number; west: number; north: number; east: number } | null;

  setEnabled: (v: boolean) => void;
  fetchForBounds: (south: number, west: number, north: number, east: number) => Promise<void>;
}

/** Pad bounds by ~50 % so small pans don't trigger refetches. */
function pad(s: number, w: number, n: number, e: number) {
  const latPad = (n - s) * 0.5;
  const lngPad = (e - w) * 0.5;
  return { south: s - latPad, west: w - lngPad, north: n + latPad, east: e + lngPad };
}

function contains(cached: { south: number; west: number; north: number; east: number }, s: number, w: number, n: number, e: number) {
  return s >= cached.south && w >= cached.west && n <= cached.north && e <= cached.east;
}

export const useAirspaceStore = create<AirspaceState>((set, get) => ({
  enabled: false,
  zones: [],
  isLoading: false,
  cachedBounds: null,

  setEnabled(v) {
    set({ enabled: v });
    if (!v) set({ zones: [], cachedBounds: null });
  },

  async fetchForBounds(south, west, north, east) {
    const { enabled, isLoading, cachedBounds } = get();
    if (!enabled || isLoading) return;
    if (cachedBounds && contains(cachedBounds, south, west, north, east)) return;

    const padded = pad(south, west, north, east);
    set({ isLoading: true });

    try {
      const data = await api.get<{ zones: AirspaceZone[] }>(
        `/airspace/zones?south=${padded.south}&west=${padded.west}&north=${padded.north}&east=${padded.east}`,
      );
      set({ zones: data.zones, cachedBounds: padded });
    } catch (err) {
      console.error("Failed to fetch airspace zones:", err);
    } finally {
      set({ isLoading: false });
    }
  },
}));
