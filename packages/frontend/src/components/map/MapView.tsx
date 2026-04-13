import { MapContainer, TileLayer, useMapEvents, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import { useMissionStore } from "@/store/missionStore";
import { calculateIdealGimbalPitch, getObstacleWarnings } from "@/lib/geo";
import { WaypointMarker } from "./WaypointMarker";
import { PoiMarker } from "./PoiMarker";
import { MapToolbar } from "./MapToolbar";
import { TemplateDrawHandler } from "./TemplateDrawHandler";
import { PencilDrawHandler } from "./PencilDrawHandler";
import { ObstacleDrawHandler } from "./ObstacleDrawHandler";
import { ObstaclePolygon } from "./ObstaclePolygon";
import { useEffect, useRef, useMemo } from "react";
import "leaflet/dist/leaflet.css";

function MapClickHandler() {
  const { isAddingWaypoint, isAddingPoi, templateMode, isDrawingObstacle, addWaypoint, addPoi } = useMissionStore();

  useMapEvents({
    click(e) {
      if (templateMode || isDrawingObstacle) return; // These modes handle their own interactions
      if (isAddingWaypoint) {
        addWaypoint(e.latlng.lat, e.latlng.lng);
      } else if (isAddingPoi) {
        addPoi(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return null;
}

/** Expose the Leaflet map instance on the container for external automation. */
function ExposeMapInstance() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    (container as any)._leaflet_map = map;
  }, [map]);
  return null;
}

/**
 * Automatically fits the map to show all waypoints when a mission is loaded
 * (import or saved route). Triggers when waypoints go from 0 to N.
 */
function FitBoundsOnLoad() {
  const map = useMap();
  const waypoints = useMissionStore((s) => s.waypoints);
  const pois = useMissionStore((s) => s.pois);
  const obstacles = useMissionStore((s) => s.obstacles);
  const prevCountRef = useRef(0);

  useEffect(() => {
    const wasEmpty = prevCountRef.current === 0;
    prevCountRef.current = waypoints.length;

    // Only fit bounds when loading a mission (0 → N waypoints)
    if (!wasEmpty || waypoints.length === 0) return;

    const points: L.LatLngExpression[] = [
      ...waypoints.map((wp) => [wp.latitude, wp.longitude] as [number, number]),
      ...pois.map((p) => [p.latitude, p.longitude] as [number, number]),
      ...obstacles.flatMap((o) => o.vertices.map((v) => [v[0], v[1]] as [number, number])),
    ];

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [waypoints, pois, obstacles, map]);

  return null;
}

function FlightPath() {
  const waypoints = useMissionStore((s) => s.waypoints);
  const obstacles = useMissionStore((s) => s.obstacles);

  const warnings = useMemo(
    () => getObstacleWarnings(waypoints, obstacles),
    [waypoints, obstacles]
  );

  // Set of segment start indices that have crossing warnings
  const warningSegments = useMemo(() => {
    const set = new Set<number>();
    for (const w of warnings) {
      if (w.type === "crosses") set.add(w.waypointIndex);
    }
    return set;
  }, [warnings]);

  if (waypoints.length < 2) return null;

  const segments = waypoints.slice(0, -1).map((wp, i) => {
    const next = waypoints[i + 1];
    const duration = Math.max(0.5, Math.min(5, 2 * (7 / wp.speed)));
    const hasWarning = warningSegments.has(wp.index);
    return {
      key: `seg-${wp.index}-${next.index}`,
      positions: [
        [wp.latitude, wp.longitude] as [number, number],
        [next.latitude, next.longitude] as [number, number],
      ],
      duration,
      hasWarning,
    };
  });

  return (
    <>
      {segments.map((seg) => (
        <Polyline
          key={seg.key}
          positions={seg.positions}
          pathOptions={{
            color: seg.hasWarning ? "#ef4444" : "#3b82f6",
            weight: 3,
            opacity: 0.8,
            dashArray: "10, 6",
          }}
          eventHandlers={{
            add: (e) => {
              const el = (e.target as any)._path as SVGElement | undefined;
              if (el) {
                el.style.animation = `dash-flow ${seg.duration.toFixed(2)}s linear infinite`;
              }
            },
          }}
        />
      ))}
    </>
  );
}

/** Dotted lines from waypoints to their referenced POI */
function PoiPointingLines() {
  const waypoints = useMissionStore((s) => s.waypoints);
  const pois = useMissionStore((s) => s.pois);

  const lines: { from: [number, number]; to: [number, number]; key: string; perfect: boolean }[] = [];

  for (const wp of waypoints) {
    if (wp.headingMode === "towardPOI" && wp.poiId) {
      const poi = pois.find((p) => p.id === wp.poiId);
      if (poi) {
        const { pitch } = calculateIdealGimbalPitch(wp, poi);
        lines.push({
          from: [wp.latitude, wp.longitude],
          to: [poi.latitude, poi.longitude],
          key: `poi-line-${wp.index}-${poi.id}`,
          perfect: wp.gimbalPitchAngle === pitch,
        });
      }
    }
  }

  return (
    <>
      {lines.map((line) => (
        <Polyline
          key={line.key}
          positions={[line.from, line.to]}
          pathOptions={{
            color: line.perfect ? "#4ade80" : "#ef4444",
            weight: line.perfect ? 3 : 2,
            opacity: line.perfect ? 0.8 : 0.6,
            dashArray: line.perfect ? undefined : "4, 8",
          }}
        />
      ))}
    </>
  );
}

export function MapView() {
  const waypoints = useMissionStore((s) => s.waypoints);
  const pois = useMissionStore((s) => s.pois);
  const obstacles = useMissionStore((s) => s.obstacles);
  const isAddingWaypoint = useMissionStore((s) => s.isAddingWaypoint);
  const isAddingPoi = useMissionStore((s) => s.isAddingPoi);
  const isDrawingObstacle = useMissionStore((s) => s.isDrawingObstacle);
  const templateMode = useMissionStore((s) => s.templateMode);

  const cursorClass = templateMode === "pencil"
    ? "map-tool-pencil"
    : templateMode
      ? "map-tool-template"
      : isDrawingObstacle
        ? "map-tool-obstacle"
        : isAddingWaypoint
          ? "map-tool-waypoint"
          : isAddingPoi
            ? "map-tool-poi"
            : "";

  return (
    <div className={`relative h-full w-full ${cursorClass}`}>
      <MapContainer
        center={[41.3874, 2.1686]}
        zoom={13}
        className="h-full w-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler />
        <ExposeMapInstance />
        <FitBoundsOnLoad />
        <FlightPath />
        <PoiPointingLines />
        <TemplateDrawHandler />
        <PencilDrawHandler />
        <ObstacleDrawHandler />
        {obstacles.map((obstacle) => (
          <ObstaclePolygon key={obstacle.id} obstacle={obstacle} />
        ))}
        {waypoints.map((wp) => (
          <WaypointMarker key={wp.index} waypoint={wp} />
        ))}
        {pois.map((poi) => (
          <PoiMarker key={poi.id} poi={poi} />
        ))}
      </MapContainer>
      <MapToolbar />
    </div>
  );
}
