import { useMissionStore } from "@/store/missionStore";
import type { SelectionMode } from "@/store/missionStore";
import { usePreferencesStore } from "@/store/preferencesStore";
import { formatHeight, formatSpeed } from "@/lib/units";
import type { Waypoint } from "@droneroute/shared";
import { useMemo, useCallback, useState, useEffect } from "react";
import { useMap } from "react-map-gl/mapbox";
import { Marker3D } from "./Marker3D";

interface WaypointMarkerProps {
  waypoint: Waypoint;
  is3D: boolean;
}

// Tiny inline SVG icons for waypoint actions
const ACTION_ICONS: Record<string, string> = {
  takePhoto: `<svg viewBox="0 0 16 16" width="12" height="12" fill="white"><circle cx="8" cy="9" r="3"/><path d="M5.5 3L4.5 4.5H2a1 1 0 00-1 1v7a1 1 0 001 1h12a1 1 0 001-1v-7a1 1 0 00-1-1h-2.5L10.5 3h-5z" fill="none" stroke="white" stroke-width="1.2"/></svg>`,
  startRecord: `<svg viewBox="0 0 16 16" width="12" height="12" fill="#ef4444"><circle cx="8" cy="8" r="5"/></svg>`,
  stopRecord: `<svg viewBox="0 0 16 16" width="12" height="12" fill="white"><rect x="4" y="4" width="8" height="8" rx="1"/></svg>`,
  gimbalRotate: `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="white" stroke-width="1.5"><path d="M3 8a5 5 0 019.5-1.5M13 8a5 5 0 01-9.5 1.5"/><path d="M12.5 4v2.5H10M3.5 12V9.5H6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  gimbalEvenlyRotate: `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="white" stroke-width="1.5"><path d="M3 4l5 8 5-8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  rotateYaw: `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="white" stroke-width="1.5"><path d="M2 8a6 6 0 0112 0M14 8a6 6 0 01-12 0"/><path d="M12 4l2 2-2 2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  hover: `<svg viewBox="0 0 16 16" width="12" height="12" fill="white"><rect x="4" y="3" width="3" height="10" rx="1"/><rect x="9" y="3" width="3" height="10" rx="1"/></svg>`,
  zoom: `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="white" stroke-width="1.5"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14" stroke-linecap="round"/><path d="M5 7h4M7 5v4" stroke-linecap="round"/></svg>`,
  focus: `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="white" stroke-width="1.5"><circle cx="8" cy="8" r="2"/><path d="M8 1v3M8 12v3M1 8h3M12 8h3" stroke-linecap="round"/></svg>`,
};

function getActionIconsHtml(waypoint: Waypoint): string {
  if (waypoint.actions.length === 0) return "";

  const uniqueTypes = [...new Set(waypoint.actions.map((a) => a.actionType))];
  const icons = uniqueTypes
    .slice(0, 3)
    .map((type) => ACTION_ICONS[type] || "")
    .filter(Boolean)
    .join("");

  const extraCount = uniqueTypes.length - 3;
  const extra =
    extraCount > 0
      ? `<span style="font-size:8px;color:white;margin-left:1px">+${extraCount}</span>`
      : "";

  return `
    <div style="
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.75);
      border-radius: 6px;
      padding: 1px 3px;
      display: flex;
      align-items: center;
      gap: 1px;
      white-space: nowrap;
      pointer-events: none;
    ">${icons}${extra}</div>
  `;
}

/**
 * Renders a subtle vertical drop line from the waypoint marker down to the ground.
 * Computes pixel distance between altitude and ground using map.project(),
 * updating on every camera move.
 */
function DropLine({ waypoint }: { waypoint: Waypoint }) {
  const { current: mapRef } = useMap();
  const [length, setLength] = useState(0);

  useEffect(() => {
    if (!mapRef) return;
    const map = mapRef.getMap();

    const update = () => {
      const lngLat = { lng: waypoint.longitude, lat: waypoint.latitude };
      const atAlt = map.project(lngLat, waypoint.height);
      const atGround = map.project(lngLat, 0);
      // Vertical distance in pixels (ground is below, so larger y)
      setLength(Math.max(0, atGround.y - atAlt.y));
    };

    update();
    map.on("move", update);
    return () => {
      map.off("move", update);
    };
  }, [mapRef, waypoint.longitude, waypoint.latitude, waypoint.height]);

  if (length < 2) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 1,
        height: length,
        marginLeft: -0.5,
        background: "rgba(148, 163, 184, 0.35)",
        pointerEvents: "none",
        transformOrigin: "top center",
      }}
    />
  );
}

export function WaypointMarker({ waypoint, is3D }: WaypointMarkerProps) {
  const { selectedWaypointIndices, selectWaypoint, moveWaypoint } =
    useMissionStore();
  const unitSystem = usePreferencesStore((s) => s.preferences.unitSystem);
  const isSelected = selectedWaypointIndices.has(waypoint.index);

  const bg = isSelected ? "#3b82f6" : "#1e293b";
  const border = isSelected ? "#93c5fd" : "#64748b";
  const actionIcons = useMemo(
    () => getActionIconsHtml(waypoint),
    [
      waypoint.actions.length,
      waypoint.actions.map((a) => a.actionType).join(","),
    ],
  );

  const showHeading =
    !waypoint.useGlobalHeadingParam &&
    (waypoint.headingMode === "fixed" ||
      waypoint.headingMode === "manually" ||
      (waypoint.headingMode === "smoothTransition" &&
        waypoint.headingAngle != null));
  const headingAngle = waypoint.headingAngle ?? 0;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      let mode: SelectionMode = "replace";
      if (e.ctrlKey || e.metaKey) {
        mode = "toggle";
      } else if (e.shiftKey) {
        mode = "range";
      }
      selectWaypoint(waypoint.index, mode);
    },
    [waypoint.index, selectWaypoint],
  );

  const handleDragEnd = useCallback(
    (e: { lngLat: { lng: number; lat: number } }) => {
      moveWaypoint(waypoint.index, e.lngLat.lat, e.lngLat.lng);
    },
    [waypoint.index, moveWaypoint],
  );

  return (
    <Marker3D
      longitude={waypoint.longitude}
      latitude={waypoint.latitude}
      altitude={is3D ? waypoint.height : 0}
      anchor="center"
      draggable
      onDragEnd={handleDragEnd}
    >
      <div
        onClick={handleClick}
        title={`${waypoint.name}\nAlt: ${formatHeight(waypoint.height, unitSystem)} | Speed: ${formatSpeed(waypoint.speed, unitSystem)}\nGimbal: ${waypoint.gimbalPitchAngle}°\n${waypoint.latitude.toFixed(6)}, ${waypoint.longitude.toFixed(6)}`}
        style={{
          position: "relative",
          background: bg,
          border: `2px solid ${border}`,
          color: "white",
          width: 28,
          height: 28,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          cursor: "grab",
          overflow: "visible",
        }}
      >
        {waypoint.index + 1}
        {actionIcons && (
          <div dangerouslySetInnerHTML={{ __html: actionIcons }} />
        )}
        {showHeading && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 0,
              height: 0,
              transform: `rotate(${headingAngle}deg) translateY(-19px)`,
              transformOrigin: "0 0",
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                marginLeft: -5,
                marginTop: -8,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderBottom: "8px solid #ef4444",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
              }}
            />
          </div>
        )}
        {is3D && <DropLine waypoint={waypoint} />}
      </div>
    </Marker3D>
  );
}
