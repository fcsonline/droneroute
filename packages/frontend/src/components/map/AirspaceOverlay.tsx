import { useEffect, useRef, useCallback } from "react";
import { Polygon, Tooltip, useMapEvents } from "react-leaflet";
import { useAirspaceStore } from "@/store/airspaceStore";
import type { AirspaceZone } from "@/store/airspaceStore";

const STYLE = {
  prohibited: { color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.25, weight: 1.5, opacity: 0.6 },
  restricted: { color: "#f97316", fillColor: "#f97316", fillOpacity: 0.18, weight: 1.5, opacity: 0.5 },
} as const;

/**
 * Converts a GeoJSON geometry (Polygon or MultiPolygon) to an array of
 * Leaflet-compatible coordinate rings: [lat, lng][][].
 */
function toLatLngRings(geometry: GeoJSON.Geometry): [number, number][][] {
  if (geometry.type === "Polygon") {
    return (geometry as GeoJSON.Polygon).coordinates.map((ring) =>
      ring.map(([lng, lat]) => [lat, lng] as [number, number]),
    );
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry as GeoJSON.MultiPolygon).coordinates.flatMap((poly) =>
      poly.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number])),
    );
  }
  return [];
}

function ZonePolygon({ zone }: { zone: AirspaceZone }) {
  const rings = toLatLngRings(zone.geometry);
  if (rings.length === 0) return null;

  const style = STYLE[zone.severity];
  const label = zone.name || zone.id;

  return (
    <Polygon positions={rings} pathOptions={style}>
      <Tooltip sticky>
        <div className="text-xs max-w-[220px]">
          <div className="font-semibold">{label}</div>
          {zone.category && <div className="text-muted-foreground">{zone.category}</div>}
          {zone.altitudeUpper != null && (
            <div>
              {zone.altitudeLower ?? 0}–{zone.altitudeUpper} m
            </div>
          )}
        </div>
      </Tooltip>
    </Polygon>
  );
}

export function AirspaceOverlay() {
  const enabled = useAirspaceStore((s) => s.enabled);
  const zones = useAirspaceStore((s) => s.zones);
  const fetchForBounds = useAirspaceStore((s) => s.fetchForBounds);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedFetch = useCallback(
    (map: L.Map) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const b = map.getBounds();
        fetchForBounds(b.getSouth(), b.getWest(), b.getNorth(), b.getEast());
      }, 300);
    },
    [fetchForBounds],
  );

  const map = useMapEvents({
    moveend() {
      if (enabled) debouncedFetch(map);
    },
  });

  // Fetch on first enable
  useEffect(() => {
    if (enabled) debouncedFetch(map);
  }, [enabled, debouncedFetch, map]);

  if (!enabled) return null;

  return (
    <>
      {zones.map((zone, i) => (
        <ZonePolygon key={`${zone.source}-${zone.id}-${i}`} zone={zone} />
      ))}
    </>
  );
}
