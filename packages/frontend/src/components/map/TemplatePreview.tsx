import { CircleMarker, Polyline } from "react-leaflet";
import type { TemplateResult, ObliqueSurveyResult } from "@/lib/templates";

const WP_DOT_THRESHOLD = 1000;

interface TemplatePreviewProps {
  result: TemplateResult;
  selectedObliquePaths?: Set<keyof ObliqueSurveyResult>;
}

const OBLIQUE_COLORS: Record<keyof ObliqueSurveyResult, string> = {
  nadir: "#a78bfa",
  a: "#f97316",
  b: "#fb923c",
  c: "#fbbf24",
  d: "#facc15",
};

export function TemplatePreview({ result, selectedObliquePaths }: TemplatePreviewProps) {
  const { waypoints, pois, oblique } = result;

  const toPositions = (wps: typeof waypoints): [number, number][] =>
    wps.map((wp) => [wp.latitude, wp.longitude]);

  // When oblique paths exist render each grid. Deselected paths are dimmed.
  const paths: Array<{ key: keyof ObliqueSurveyResult; wps: typeof waypoints; color: string }> =
    oblique
      ? (Object.entries(oblique) as [keyof ObliqueSurveyResult, typeof waypoints][]).map(
          ([name, wps]) => ({ key: name, wps, color: OBLIQUE_COLORS[name] }),
        )
      : [{ key: "nadir" as const, wps: waypoints, color: "#a78bfa" }];

  const totalPreviewWps = paths.reduce((s, p) => s + p.wps.length, 0);
  const showDots = totalPreviewWps <= WP_DOT_THRESHOLD;

  return (
    <>
      {paths.map(({ key, wps, color }) => {
        const positions = toPositions(wps);
        const isSelected = !selectedObliquePaths || selectedObliquePaths.has(key);
        return (
          <Polyline
            key={`preview-path-${key}`}
            positions={positions}
            pathOptions={{
              color,
              weight: isSelected ? 2 : 1.5,
              opacity: isSelected ? 0.75 : 0.2,
              dashArray: "6, 4",
            }}
          />
        );
      })}

      {/* Waypoint dots suppressed above threshold to keep the map responsive */}
      {showDots && waypoints.map((wp, i) => (
        <CircleMarker
          key={`preview-wp-${i}`}
          center={[wp.latitude, wp.longitude]}
          radius={3}
          pathOptions={{
            color: "#a78bfa",
            fillColor: "#c4b5fd",
            fillOpacity: 0.8,
            weight: 1,
          }}
        />
      ))}

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
