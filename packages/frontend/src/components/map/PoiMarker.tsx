import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { useMissionStore } from "@/store/missionStore";
import { useUnitSystem } from "@/store/unitsStore";
import { fmtAlt } from "@/lib/units";
import type { PointOfInterest } from "@droneroute/shared";
import { useMemo, useEffect, useState } from "react";

interface PoiMarkerProps {
  poi: PointOfInterest;
}

function createPoiIcon(
  name: string,
  isSelected: boolean,
  ctrlReady: boolean,
): L.DivIcon {
  const bg = isSelected ? "#ef4444" : "#dc2626";
  const border = isSelected ? "#fca5a5" : "#991b1b";
  const cursor = ctrlReady ? "crosshair" : "grab";

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
        cursor: ${cursor};
        clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);
      ">&#x25CE;</div>
    `,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function PoiMarker({ poi }: PoiMarkerProps) {
  const sys = useUnitSystem();
  const {
    selectedPoiId,
    selectPoi,
    movePoi,
    selectedWaypointIndices,
    updateWaypoint,
  } = useMissionStore();
  const isSelected = selectedPoiId === poi.id;
  const [ctrlHeld, setCtrlHeld] = useState(false);
  const hasSelectedWaypoints = selectedWaypointIndices.size > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta")
        setCtrlHeld(e.type === "keydown");
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  const ctrlReady = ctrlHeld && hasSelectedWaypoints;

  const icon = useMemo(
    () => createPoiIcon(poi.name, isSelected, ctrlReady),
    [poi.name, isSelected, ctrlReady],
  );

  return (
    <Marker
      position={[poi.latitude, poi.longitude]}
      icon={icon}
      draggable
      eventHandlers={{
        click: (e) => {
          const nativeEvent = e.originalEvent;
          if (
            (nativeEvent.ctrlKey || nativeEvent.metaKey) &&
            hasSelectedWaypoints
          ) {
            // Ctrl+click: assign ALL selected waypoints heading toward this POI
            for (const idx of selectedWaypointIndices) {
              updateWaypoint(idx, {
                headingMode: "towardPOI",
                poiId: poi.id,
                useGlobalHeadingParam: false,
              });
            }
          } else {
            selectPoi(poi.id);
          }
        },
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          movePoi(poi.id, pos.lat, pos.lng);
        },
      }}
    >
      <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
        <div className="text-xs">
          <strong>{poi.name}</strong>
          <br />
          Height: {fmtAlt(poi.height, sys)}
          {ctrlReady && (
            <>
              <br />
              <span className="text-blue-500 font-semibold">
                Ctrl+click to aim{" "}
                {selectedWaypointIndices.size === 1
                  ? "waypoint"
                  : `${selectedWaypointIndices.size} waypoints`}{" "}
                here
              </span>
            </>
          )}
        </div>
      </Tooltip>
    </Marker>
  );
}
