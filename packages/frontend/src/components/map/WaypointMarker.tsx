import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useMissionStore } from "@/store/missionStore";
import type { Waypoint } from "@droneroute/shared";
import { useMemo } from "react";

interface WaypointMarkerProps {
  waypoint: Waypoint;
}

// Tiny inline SVG icons for waypoint actions
const ACTION_ICONS: Record<string, string> = {
  takePhoto: `<svg viewBox="0 0 16 16" width="12" height="12" fill="white"><circle cx="8" cy="9" r="3"/><path d="M5.5 3L4.5 4.5H2a1 1 0 00-1 1v7a1 1 0 001 1h12a1 1 0 001-1v-7a1 1 0 00-1-1h-2.5L10.5 3h-5z" fill="none" stroke="white" stroke-width="1.2"/></svg>`,
  startRecord: `<svg viewBox="0 0 16 16" width="12" height="12" fill="#ef4444"><circle cx="8" cy="8" r="5"/></svg>`,
  stopRecord: `<svg viewBox="0 0 16 16" width="12" height="12" fill="white"><rect x="4" y="4" width="8" height="8" rx="1"/></svg>`,
  gimbalRotate: `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="white" stroke-width="1.5"><path d="M3 8a5 5 0 019.5-1.5M13 8a5 5 0 01-9.5 1.5"/><path d="M12.5 4v2.5H10M3.5 12V9.5H6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  rotateYaw: `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="white" stroke-width="1.5"><path d="M2 8a6 6 0 0112 0M14 8a6 6 0 01-12 0"/><path d="M12 4l2 2-2 2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  hover: `<svg viewBox="0 0 16 16" width="12" height="12" fill="white"><rect x="4" y="3" width="3" height="10" rx="1"/><rect x="9" y="3" width="3" height="10" rx="1"/></svg>`,
  zoom: `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="white" stroke-width="1.5"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14" stroke-linecap="round"/><path d="M5 7h4M7 5v4" stroke-linecap="round"/></svg>`,
  focus: `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="white" stroke-width="1.5"><circle cx="8" cy="8" r="2"/><path d="M8 1v3M8 12v3M1 8h3M12 8h3" stroke-linecap="round"/></svg>`,
};

function getActionIcons(waypoint: Waypoint): string {
  if (waypoint.actions.length === 0) return "";

  // Deduplicate action types and get up to 3 icons
  const uniqueTypes = [...new Set(waypoint.actions.map((a) => a.actionType))];
  const icons = uniqueTypes
    .slice(0, 3)
    .map((type) => ACTION_ICONS[type] || "")
    .filter(Boolean)
    .join("");

  const extraCount = uniqueTypes.length - 3;
  const extra = extraCount > 0 ? `<span style="font-size:8px;color:white;margin-left:1px">+${extraCount}</span>` : "";

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

function createWaypointIcon(index: number, isSelected: boolean, waypoint: Waypoint): L.DivIcon {
  const bg = isSelected ? "#3b82f6" : "#1e293b";
  const border = isSelected ? "#93c5fd" : "#64748b";
  const actionIcons = getActionIcons(waypoint);
  const hasActions = waypoint.actions.length > 0;

  // Heading cone: show when waypoint has explicit fixed/manual heading
  const showCone = !waypoint.useGlobalHeadingParam &&
    (waypoint.headingMode === "fixed" || waypoint.headingMode === "manually");
  const headingAngle = waypoint.headingAngle ?? 0;

  // Cone is rendered as an absolutely-positioned element behind the marker circle.
  // It uses clip-path to create a ~50° triangular wedge, rotated to match heading.
  // headingAngle: 0° = North, 90° = East. CSS rotate 0° = up, so they align.
  const coneHtml = showCone
    ? `<div style="
        position: absolute;
        top: 50%;
        left: 50%;
        width: 48px;
        height: 48px;
        margin-left: -24px;
        margin-top: -24px;
        transform: rotate(${headingAngle}deg);
        transform-origin: center center;
        pointer-events: none;
        z-index: -1;
      ">
        <div style="
          position: absolute;
          top: 0;
          left: 50%;
          margin-left: -24px;
          width: 48px;
          height: 24px;
          background: rgba(239, 68, 68, 0.35);
          clip-path: polygon(50% 100%, 15% 0%, 85% 0%);
          border: none;
        "></div>
      </div>`
    : "";

  // When cone is shown, we need a larger icon container
  const size = showCone ? 68 : 28;
  const anchor = showCone ? 34 : 14;

  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${showCone ? (hasActions ? 80 : size) : (hasActions ? 40 : 28)}px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${coneHtml}
        <div style="
          position: relative;
          background: ${bg};
          border: 2px solid ${border};
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          cursor: grab;
          z-index: 1;
        ">${index + 1}${actionIcons}</div>
      </div>
    `,
    className: "",
    iconSize: [size, showCone ? (hasActions ? 80 : size) : (hasActions ? 40 : 28)],
    iconAnchor: [anchor, showCone ? anchor : 14],
  });
}

export function WaypointMarker({ waypoint }: WaypointMarkerProps) {
  const { selectedWaypointIndex, selectWaypoint, moveWaypoint } = useMissionStore();
  const isSelected = selectedWaypointIndex === waypoint.index;

  const icon = useMemo(
    () => createWaypointIcon(waypoint.index, isSelected, waypoint),
    [waypoint.index, isSelected, waypoint.actions.length, waypoint.actions.map((a) => a.actionType).join(","), waypoint.headingMode, waypoint.headingAngle, waypoint.useGlobalHeadingParam]
  );

  return (
    <Marker
      position={[waypoint.latitude, waypoint.longitude]}
      icon={icon}
      draggable
      eventHandlers={{
        click: () => selectWaypoint(waypoint.index),
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          moveWaypoint(waypoint.index, pos.lat, pos.lng);
        },
      }}
    >
      <Popup>
        <div className="text-xs">
          <strong>{waypoint.name}</strong>
          <br />
          Alt: {waypoint.height}m | Speed: {waypoint.speed}m/s
          <br />
          Gimbal: {waypoint.gimbalPitchAngle}&deg;
          {waypoint.actions.length > 0 && (
            <>
              <br />
              Actions: {waypoint.actions.length}
            </>
          )}
          <br />
          {waypoint.latitude.toFixed(6)}, {waypoint.longitude.toFixed(6)}
        </div>
      </Popup>
    </Marker>
  );
}
