import { Polygon, CircleMarker, Marker } from "react-leaflet";
import L from "leaflet";
import type { Obstacle } from "@droneroute/shared";
import { useMissionStore } from "@/store/missionStore";
import { useCallback, useMemo } from "react";

interface ObstaclePolygonProps {
  obstacle: Obstacle;
}

function makeVertexIcon(isHover = false) {
  const size = isHover ? 14 : 12;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#fff;border:2px solid #ef4444;cursor:move;"></div>`,
  });
}

function makeMidpointIcon() {
  return L.divIcon({
    className: "",
    iconSize: [8, 8],
    iconAnchor: [4, 4],
    html: `<div style="width:8px;height:8px;border-radius:50%;background:#fecaca;border:1px solid #ef4444;cursor:pointer;opacity:0.7;"></div>`,
  });
}

const vertexIcon = makeVertexIcon();
const midpointIcon = makeMidpointIcon();

export function ObstaclePolygon({ obstacle }: ObstaclePolygonProps) {
  const selectedObstacleId = useMissionStore((s) => s.selectedObstacleId);
  const selectObstacle = useMissionStore((s) => s.selectObstacle);
  const moveObstacleVertex = useMissionStore((s) => s.moveObstacleVertex);
  const addObstacleVertex = useMissionStore((s) => s.addObstacleVertex);
  const removeObstacleVertex = useMissionStore((s) => s.removeObstacleVertex);

  const isSelected = selectedObstacleId === obstacle.id;
  const positions: [number, number][] = useMemo(
    () => obstacle.vertices.map(([lat, lng]) => [lat, lng] as [number, number]),
    [obstacle.vertices],
  );

  const handleClick = useCallback(() => {
    selectObstacle(isSelected ? null : obstacle.id);
  }, [isSelected, obstacle.id, selectObstacle]);

  // Compute midpoints between consecutive vertices
  const midpoints: [number, number][] = useMemo(() => {
    if (!isSelected || positions.length < 2) return [];
    return positions.map((curr, i) => {
      const next = positions[(i + 1) % positions.length];
      return [(curr[0] + next[0]) / 2, (curr[1] + next[1]) / 2] as [
        number,
        number,
      ];
    });
  }, [isSelected, positions]);

  return (
    <>
      <Polygon
        positions={positions}
        pathOptions={{
          color: "#ef4444",
          fillColor: "#ef4444",
          fillOpacity: isSelected ? 0.2 : 0.12,
          weight: isSelected ? 3 : 2,
          opacity: isSelected ? 1 : 0.7,
        }}
        eventHandlers={{
          click: (e) => {
            e.originalEvent.stopPropagation();
            handleClick();
          },
        }}
      />

      {/* Vertex handles (draggable markers when selected) */}
      {isSelected &&
        positions.map((pos, i) => (
          <Marker
            key={`obs-v-${obstacle.id}-${i}`}
            position={pos}
            icon={vertexIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                moveObstacleVertex(obstacle.id, i, lat, lng);
              },
              contextmenu: (e) => {
                e.originalEvent.preventDefault();
                if (obstacle.vertices.length > 3) {
                  removeObstacleVertex(obstacle.id, i);
                }
              },
            }}
          />
        ))}

      {/* Midpoint handles (click to insert vertex) */}
      {isSelected &&
        midpoints.map((pos, i) => (
          <Marker
            key={`obs-mid-${obstacle.id}-${i}`}
            position={pos}
            icon={midpointIcon}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                addObstacleVertex(obstacle.id, i, pos[0], pos[1]);
              },
            }}
          />
        ))}
    </>
  );
}
