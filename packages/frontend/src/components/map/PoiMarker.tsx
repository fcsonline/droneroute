import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useMissionStore } from "@/store/missionStore";
import type { PointOfInterest } from "@droneroute/shared";
import { useMemo } from "react";

interface PoiMarkerProps {
  poi: PointOfInterest;
}

function createPoiIcon(name: string, isSelected: boolean): L.DivIcon {
  const bg = isSelected ? "#ef4444" : "#dc2626";
  const border = isSelected ? "#fca5a5" : "#991b1b";

  return L.divIcon({
    html: `
      <div style="
        background: ${bg};
        border: 2px solid ${border};
        color: white;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        cursor: grab;
        clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);
      ">&#x25CE;</div>
    `,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function PoiMarker({ poi }: PoiMarkerProps) {
  const { selectedPoiId, selectPoi, movePoi } = useMissionStore();
  const isSelected = selectedPoiId === poi.id;

  const icon = useMemo(
    () => createPoiIcon(poi.name, isSelected),
    [poi.name, isSelected]
  );

  return (
    <Marker
      position={[poi.latitude, poi.longitude]}
      icon={icon}
      draggable
      eventHandlers={{
        click: () => selectPoi(poi.id),
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          movePoi(poi.id, pos.lat, pos.lng);
        },
      }}
    >
      <Popup>
        <div className="text-xs">
          <strong>{poi.name}</strong>
          <br />
          Height: {poi.height}m
          <br />
          {poi.latitude.toFixed(6)}, {poi.longitude.toFixed(6)}
        </div>
      </Popup>
    </Marker>
  );
}
