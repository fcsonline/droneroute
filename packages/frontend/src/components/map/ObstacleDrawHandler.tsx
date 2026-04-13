import { useMapEvents, Polyline, CircleMarker } from "react-leaflet";
import { useMissionStore } from "@/store/missionStore";
import { useEffect } from "react";

/**
 * Handles obstacle polygon drawing on the map.
 * Click to place vertices, double-click or click near first vertex to close.
 * Escape to cancel.
 */
export function ObstacleDrawHandler() {
  const isDrawingObstacle = useMissionStore((s) => s.isDrawingObstacle);
  const drawingVertices = useMissionStore((s) => s.drawingVertices);
  const setDrawingVertices = useMissionStore((s) => s.setDrawingVertices);
  const addObstacle = useMissionStore((s) => s.addObstacle);
  const setIsDrawingObstacle = useMissionStore((s) => s.setIsDrawingObstacle);

  // Escape key cancels drawing
  useEffect(() => {
    if (!isDrawingObstacle) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawingVertices([]);
        setIsDrawingObstacle(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isDrawingObstacle, setDrawingVertices, setIsDrawingObstacle]);

  useMapEvents({
    click(e) {
      if (!isDrawingObstacle) return;

      const newVertex: [number, number] = [e.latlng.lat, e.latlng.lng];

      // If we have >= 3 vertices and click is near the first vertex, close the polygon
      if (drawingVertices.length >= 3) {
        const [firstLat, firstLng] = drawingVertices[0];
        const map = e.target;
        const firstPoint = map.latLngToContainerPoint([firstLat, firstLng]);
        const clickPoint = map.latLngToContainerPoint(e.latlng);
        const dist = firstPoint.distanceTo(clickPoint);
        if (dist < 15) {
          addObstacle(drawingVertices);
          return;
        }
      }

      setDrawingVertices([...drawingVertices, newVertex]);
    },
    dblclick(e) {
      if (!isDrawingObstacle) return;
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();

      // Need at least 3 vertices (the dblclick also fires a click, so we
      // may have just added a vertex. Check for 3+ after deduplication.)
      const verts = drawingVertices;
      if (verts.length >= 3) {
        addObstacle(verts);
      }
    },
  });

  if (!isDrawingObstacle || drawingVertices.length === 0) return null;

  const positions = drawingVertices.map(([lat, lng]) => [lat, lng] as [number, number]);

  return (
    <>
      {/* Placed vertices */}
      {positions.map((pos, i) => (
        <CircleMarker
          key={`draw-v-${i}`}
          center={pos}
          radius={i === 0 ? 7 : 5}
          pathOptions={{
            color: "#ef4444",
            fillColor: i === 0 ? "#fca5a5" : "#ffffff",
            fillOpacity: 1,
            weight: 2,
          }}
        />
      ))}

      {/* Lines between placed vertices */}
      {positions.length >= 2 && (
        <Polyline
          positions={positions}
          pathOptions={{
            color: "#ef4444",
            weight: 2,
            dashArray: "6, 4",
            opacity: 0.8,
          }}
        />
      )}

      {/* Closing line preview (last → first) */}
      {positions.length >= 3 && (
        <Polyline
          positions={[positions[positions.length - 1], positions[0]]}
          pathOptions={{
            color: "#ef4444",
            weight: 1.5,
            dashArray: "4, 6",
            opacity: 0.4,
          }}
        />
      )}
    </>
  );
}
