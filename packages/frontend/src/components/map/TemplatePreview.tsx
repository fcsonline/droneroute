import { CircleMarker, Polyline } from "react-leaflet";
import type { TemplateResult } from "@/lib/templates";

interface TemplatePreviewProps {
  result: TemplateResult;
}

export function TemplatePreview({ result }: TemplatePreviewProps) {
  const { waypoints, pois } = result;

  // Build polyline from waypoint positions
  const positions: [number, number][] = waypoints.map((wp) => [wp.latitude, wp.longitude]);

  return (
    <>
      {/* Flight path preview */}
      {positions.length >= 2 && (
        <Polyline
          positions={positions}
          pathOptions={{
            color: "#a78bfa",
            weight: 2,
            opacity: 0.7,
            dashArray: "6, 4",
          }}
        />
      )}

      {/* Waypoint markers */}
      {waypoints.map((wp, i) => (
        <CircleMarker
          key={`preview-wp-${i}`}
          center={[wp.latitude, wp.longitude]}
          radius={5}
          pathOptions={{
            color: "#a78bfa",
            fillColor: "#c4b5fd",
            fillOpacity: 0.8,
            weight: 2,
          }}
        />
      ))}

      {/* POI markers */}
      {pois.map((poi, i) => (
        <CircleMarker
          key={`preview-poi-${i}`}
          center={[poi.latitude, poi.longitude]}
          radius={7}
          pathOptions={{
            color: "#f59e0b",
            fillColor: "#fbbf24",
            fillOpacity: 0.8,
            weight: 2,
          }}
        />
      ))}
    </>
  );
}
