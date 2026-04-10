import { MapContainer, TileLayer, useMapEvents, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import { useMissionStore } from "@/store/missionStore";
import { calculateIdealGimbalPitch } from "@/lib/geo";
import { WaypointMarker } from "./WaypointMarker";
import { PoiMarker } from "./PoiMarker";
import { MapToolbar } from "./MapToolbar";
import { TemplateDrawHandler } from "./TemplateDrawHandler";
import { PencilDrawHandler } from "./PencilDrawHandler";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

function MapClickHandler() {
  const { isAddingWaypoint, isAddingPoi, templateMode, addWaypoint, addPoi } = useMissionStore();

  useMapEvents({
    click(e) {
      if (templateMode) return; // Template mode handles its own interactions
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
  const prevCountRef = useRef(0);

  useEffect(() => {
    const wasEmpty = prevCountRef.current === 0;
    prevCountRef.current = waypoints.length;

    // Only fit bounds when loading a mission (0 → N waypoints)
    if (!wasEmpty || waypoints.length === 0) return;

    const points: L.LatLngExpression[] = [
      ...waypoints.map((wp) => [wp.latitude, wp.longitude] as [number, number]),
      ...pois.map((p) => [p.latitude, p.longitude] as [number, number]),
    ];

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [waypoints, pois, map]);

  return null;
}

function FlightPath() {
  const waypoints = useMissionStore((s) => s.waypoints);

  if (waypoints.length < 2) return null;

  // Render each segment as its own Polyline so animation speed
  // matches the departing waypoint's speed.
  // Baseline: 7 m/s → 2s duration, scales inversely, clamped 0.5s–5s.
  const segments = waypoints.slice(0, -1).map((wp, i) => {
    const next = waypoints[i + 1];
    const duration = Math.max(0.5, Math.min(5, 2 * (7 / wp.speed)));
    return {
      key: `seg-${wp.index}-${next.index}`,
      positions: [
        [wp.latitude, wp.longitude] as [number, number],
        [next.latitude, next.longitude] as [number, number],
      ],
      duration,
    };
  });

  return (
    <>
      {segments.map((seg) => (
        <Polyline
          key={seg.key}
          positions={seg.positions}
          pathOptions={{
            color: "#3b82f6",
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
  const isAddingWaypoint = useMissionStore((s) => s.isAddingWaypoint);
  const isAddingPoi = useMissionStore((s) => s.isAddingPoi);
  const templateMode = useMissionStore((s) => s.templateMode);

  const cursorClass = templateMode === "pencil"
    ? "map-tool-pencil"
    : templateMode
      ? "map-tool-template"
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
