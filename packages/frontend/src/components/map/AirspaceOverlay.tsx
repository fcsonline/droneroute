import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { Source, Layer, Popup, useMap } from "react-map-gl/mapbox";
import { useAirspaceStore } from "@/store/airspaceStore";

interface HoveredZone {
  lng: number;
  lat: number;
  name: string;
  category: string;
  severity: string;
}

/**
 * Renders airspace restriction zones as colored polygons on the Mapbox map.
 * Fetches zones from the backend when the map viewport changes.
 */
export function AirspaceOverlay() {
  const enabled = useAirspaceStore((s) => s.enabled);
  const zones = useAirspaceStore((s) => s.zones);
  const fetchForBounds = useAirspaceStore((s) => s.fetchForBounds);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { current: map } = useMap();
  const [hovered, setHovered] = useState<HoveredZone | null>(null);

  const debouncedFetch = useCallback(() => {
    if (!map) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const b = map.getBounds();
      if (!b) return;
      fetchForBounds(b.getSouth(), b.getWest(), b.getNorth(), b.getEast());
    }, 300);
  }, [map, fetchForBounds]);

  // Listen to moveend for viewport changes
  useEffect(() => {
    if (!map || !enabled) return;
    const handler = () => debouncedFetch();
    map.on("moveend", handler);
    // Fetch on first enable
    debouncedFetch();
    return () => {
      map.off("moveend", handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [map, enabled, debouncedFetch]);

  // Hover interaction for tooltip
  useEffect(() => {
    if (!map || !enabled) return;
    const m = map.getMap();

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      const features = m.queryRenderedFeatures(e.point, {
        layers: ["airspace-zones-fill"],
      });
      if (features && features.length > 0) {
        m.getCanvas().style.cursor = "pointer";
        const props = features[0].properties;
        if (props) {
          setHovered({
            lng: e.lngLat.lng,
            lat: e.lngLat.lat,
            name: props.name || "",
            category: props.category || "",
            severity: props.severity || "",
          });
        }
      } else {
        m.getCanvas().style.cursor = "";
        setHovered(null);
      }
    };

    const onMouseLeave = () => {
      m.getCanvas().style.cursor = "";
      setHovered(null);
    };

    m.on("mousemove", "airspace-zones-fill", onMouseMove);
    m.on("mouseleave", "airspace-zones-fill", onMouseLeave);
    return () => {
      m.off("mousemove", "airspace-zones-fill", onMouseMove);
      m.off("mouseleave", "airspace-zones-fill", onMouseLeave);
      m.getCanvas().style.cursor = "";
    };
  }, [map, enabled]);

  // Build a GeoJSON FeatureCollection from all zones
  const geojson = useMemo(() => {
    const features = zones.map((zone, i) => ({
      type: "Feature" as const,
      id: i,
      properties: {
        severity: zone.severity,
        name: zone.name || zone.id,
        category: zone.category || "",
      },
      geometry: zone.geometry,
    }));
    return { type: "FeatureCollection" as const, features };
  }, [zones]);

  if (!enabled || zones.length === 0) return null;

  return (
    <>
      <Source id="airspace-zones" type="geojson" data={geojson}>
        <Layer
          id="airspace-zones-fill"
          type="fill"
          paint={{
            "fill-color": [
              "match",
              ["get", "severity"],
              "prohibited",
              "#ef4444",
              "#f97316",
            ],
            "fill-opacity": [
              "match",
              ["get", "severity"],
              "prohibited",
              0.25,
              0.18,
            ],
          }}
        />
        <Layer
          id="airspace-zones-outline"
          type="line"
          paint={{
            "line-color": [
              "match",
              ["get", "severity"],
              "prohibited",
              "#ef4444",
              "#f97316",
            ],
            "line-width": 1.5,
            "line-opacity": [
              "match",
              ["get", "severity"],
              "prohibited",
              0.6,
              0.5,
            ],
          }}
        />
      </Source>

      {hovered && (
        <Popup
          longitude={hovered.lng}
          latitude={hovered.lat}
          anchor="bottom"
          closeButton={false}
          closeOnClick={false}
          className="airspace-tooltip"
          offset={8}
        >
          <div className="text-xs max-w-[220px]">
            <div className="font-semibold">{hovered.name}</div>
            {hovered.category && (
              <div className="text-muted-foreground capitalize">
                {hovered.category.replace(/-/g, " ")}
              </div>
            )}
            <div
              className={
                hovered.severity === "prohibited"
                  ? "text-red-400 font-medium"
                  : "text-orange-400 font-medium"
              }
            >
              {hovered.severity === "prohibited" ? "Prohibited" : "Restricted"}
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}
