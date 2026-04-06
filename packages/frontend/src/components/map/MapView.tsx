import { MapContainer, TileLayer, useMapEvents, Polyline } from "react-leaflet";
import { useMissionStore } from "@/store/missionStore";
import { WaypointMarker } from "./WaypointMarker";
import { PoiMarker } from "./PoiMarker";
import { MapToolbar } from "./MapToolbar";
import "leaflet/dist/leaflet.css";

function MapClickHandler() {
  const { isAddingWaypoint, isAddingPoi, addWaypoint, addPoi } = useMissionStore();

  useMapEvents({
    click(e) {
      if (isAddingWaypoint) {
        addWaypoint(e.latlng.lat, e.latlng.lng);
      } else if (isAddingPoi) {
        addPoi(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return null;
}

function FlightPath() {
  const waypoints = useMissionStore((s) => s.waypoints);

  if (waypoints.length < 2) return null;

  const positions = waypoints.map(
    (wp) => [wp.latitude, wp.longitude] as [number, number]
  );

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: "#3b82f6",
        weight: 3,
        opacity: 0.8,
        dashArray: "10, 6",
      }}
    />
  );
}

/** Dotted lines from waypoints to their referenced POI */
function PoiPointingLines() {
  const waypoints = useMissionStore((s) => s.waypoints);
  const pois = useMissionStore((s) => s.pois);

  const lines: { from: [number, number]; to: [number, number]; key: string }[] = [];

  for (const wp of waypoints) {
    if (wp.headingMode === "towardPOI" && wp.poiId) {
      const poi = pois.find((p) => p.id === wp.poiId);
      if (poi) {
        lines.push({
          from: [wp.latitude, wp.longitude],
          to: [poi.latitude, poi.longitude],
          key: `poi-line-${wp.index}-${poi.id}`,
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
            color: "#ef4444",
            weight: 2,
            opacity: 0.6,
            dashArray: "4, 8",
          }}
        />
      ))}
    </>
  );
}

export function MapView() {
  const waypoints = useMissionStore((s) => s.waypoints);
  const pois = useMissionStore((s) => s.pois);

  return (
    <div className="relative h-full w-full">
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
        <FlightPath />
        <PoiPointingLines />
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
