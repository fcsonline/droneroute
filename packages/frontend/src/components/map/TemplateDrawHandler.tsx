import { useState, useCallback, useMemo, useEffect } from "react";
import {
  useMapEvents,
  CircleMarker,
  Polyline,
  Circle,
  Rectangle,
} from "react-leaflet";
import { useMissionStore } from "@/store/missionStore";
import { TemplateConfigPanel } from "./TemplateConfigPanel";
import { TemplatePreview } from "./TemplatePreview";
import type {
  TemplateType,
  OrbitParams,
  GridParams,
  FacadeParams,
  TemplateResult,
} from "@/lib/templates";
import {
  generateOrbit,
  generateGrid,
  generateFacade,
  DEFAULT_ORBIT_PARAMS,
  DEFAULT_GRID_PARAMS,
  DEFAULT_FACADE_PARAMS,
} from "@/lib/templates";

/** Haversine distance in meters (local copy to avoid circular imports) */
function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface DragState {
  start: [number, number];
  end: [number, number];
}

export function TemplateDrawHandler() {
  const templateMode = useMissionStore((s) => s.templateMode);
  const setTemplateMode = useMissionStore((s) => s.setTemplateMode);
  const appendWaypoints = useMissionStore((s) => s.appendWaypoints);

  const [dragging, setDragging] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Editable params (populated after drag completes)
  const [orbitParams, setOrbitParams] = useState<OrbitParams | null>(null);
  const [gridParams, setGridParams] = useState<GridParams | null>(null);
  const [facadeParams, setFacadeParams] = useState<FacadeParams | null>(null);

  const resetState = useCallback(() => {
    setDragging(false);
    setDragState(null);
    setConfirmed(false);
    setOrbitParams(null);
    setGridParams(null);
    setFacadeParams(null);
  }, []);

  // Reset all internal state when templateMode changes (e.g. Escape, switching type)
  useEffect(() => {
    resetState();
  }, [templateMode, resetState]);

  useMapEvents({
    mousedown(e) {
      if (
        !templateMode ||
        templateMode === "pencil" ||
        templateMode === "area" ||
        confirmed
      )
        return;
      // Prevent map drag
      e.originalEvent.preventDefault();
      e.target.dragging?.disable();
      const pos: [number, number] = [e.latlng.lat, e.latlng.lng];
      setDragging(true);
      setDragState({ start: pos, end: pos });
    },
    mousemove(e) {
      if (!dragging || !dragState) return;
      setDragState((prev) =>
        prev ? { ...prev, end: [e.latlng.lat, e.latlng.lng] } : null,
      );
    },
    mouseup(e) {
      if (!dragging || !dragState || !templateMode) return;
      e.target.dragging?.enable();
      setDragging(false);

      const endPos: [number, number] = [e.latlng.lat, e.latlng.lng];
      const finalDrag = { ...dragState, end: endPos };
      setDragState(finalDrag);

      const dist = haversine(
        finalDrag.start[0],
        finalDrag.start[1],
        finalDrag.end[0],
        finalDrag.end[1],
      );

      // Minimum drag distance of 5 meters
      if (dist < 5) {
        resetState();
        return;
      }

      // Create initial params based on template type
      if (templateMode === "orbit") {
        setOrbitParams({
          ...DEFAULT_ORBIT_PARAMS,
          center: finalDrag.start,
          radiusM: Math.round(dist),
        });
      } else if (templateMode === "grid") {
        setGridParams({
          ...DEFAULT_GRID_PARAMS,
          corner1: finalDrag.start,
          corner2: finalDrag.end,
        });
      } else if (templateMode === "facade") {
        setFacadeParams({
          ...DEFAULT_FACADE_PARAMS,
          point1: finalDrag.start,
          point2: finalDrag.end,
        });
      }

      setConfirmed(true);
    },
  });

  // Generate preview from current params
  const preview: TemplateResult | null = useMemo(() => {
    if (orbitParams) return generateOrbit(orbitParams);
    if (gridParams) return generateGrid(gridParams);
    if (facadeParams) return generateFacade(facadeParams);
    return null;
  }, [orbitParams, gridParams, facadeParams]);

  // Live preview during drag (before config panel)
  const dragPreview = useMemo(() => {
    if (!dragging || !dragState || !templateMode) return null;
    const dist = haversine(
      dragState.start[0],
      dragState.start[1],
      dragState.end[0],
      dragState.end[1],
    );
    if (dist < 5) return null;

    if (templateMode === "orbit") {
      return generateOrbit({
        ...DEFAULT_ORBIT_PARAMS,
        center: dragState.start,
        radiusM: Math.round(dist),
      });
    }
    if (templateMode === "grid") {
      return generateGrid({
        ...DEFAULT_GRID_PARAMS,
        corner1: dragState.start,
        corner2: dragState.end,
      });
    }
    if (templateMode === "facade") {
      return generateFacade({
        ...DEFAULT_FACADE_PARAMS,
        point1: dragState.start,
        point2: dragState.end,
      });
    }
    return null;
  }, [dragging, dragState, templateMode]);

  if (!templateMode || templateMode === "pencil" || templateMode === "area")
    return null;

  const handleApply = () => {
    if (preview) {
      appendWaypoints(preview.waypoints, preview.pois);
    }
    resetState();
  };

  const handleCancel = () => {
    resetState();
    setTemplateMode(null);
  };

  const activePreview = confirmed ? preview : dragPreview;

  return (
    <>
      {/* Draw guide during drag */}
      {dragging && dragState && templateMode === "orbit" && (
        <>
          <Circle
            center={dragState.start}
            radius={haversine(
              dragState.start[0],
              dragState.start[1],
              dragState.end[0],
              dragState.end[1],
            )}
            pathOptions={{
              color: "#a78bfa",
              weight: 2,
              opacity: 0.5,
              fillOpacity: 0.05,
              dashArray: "6, 4",
            }}
          />
          <CircleMarker
            center={dragState.start}
            radius={4}
            pathOptions={{
              color: "#a78bfa",
              fillColor: "#a78bfa",
              fillOpacity: 1,
            }}
          />
        </>
      )}
      {dragging && dragState && templateMode === "grid" && (
        <Rectangle
          bounds={[dragState.start, dragState.end]}
          pathOptions={{
            color: "#a78bfa",
            weight: 2,
            opacity: 0.5,
            fillOpacity: 0.05,
            dashArray: "6, 4",
          }}
        />
      )}
      {dragging && dragState && templateMode === "facade" && (
        <>
          <Polyline
            positions={[dragState.start, dragState.end]}
            pathOptions={{ color: "#a78bfa", weight: 3, opacity: 0.7 }}
          />
          <CircleMarker
            center={dragState.start}
            radius={4}
            pathOptions={{
              color: "#a78bfa",
              fillColor: "#a78bfa",
              fillOpacity: 1,
            }}
          />
          <CircleMarker
            center={dragState.end}
            radius={4}
            pathOptions={{
              color: "#a78bfa",
              fillColor: "#a78bfa",
              fillOpacity: 1,
            }}
          />
        </>
      )}

      {/* Preview waypoints */}
      {activePreview && <TemplatePreview result={activePreview} />}

      {/* Config panel (shown after drag completes) */}
      {confirmed && (
        <TemplateConfigPanel
          type={templateMode}
          orbitParams={orbitParams}
          gridParams={gridParams}
          facadeParams={facadeParams}
          onOrbitChange={setOrbitParams}
          onGridChange={setGridParams}
          onFacadeChange={setFacadeParams}
          onApply={handleApply}
          onCancel={handleCancel}
          waypointCount={activePreview?.waypoints.length ?? 0}
        />
      )}
    </>
  );
}
